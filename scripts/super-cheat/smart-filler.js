const lib = require('super-cheat/lib');

const range = 27;

const baseColor = Pal.reactorPurple;
const tilesize = Vars.tilesize;
const indexer = Vars.indexer;
const world = Vars.world;
const content = Vars.content;
const state = Vars.state;

const taken = new IntSet();

const itemValueList = [];
const bestTurretCoolantMap = {};
const bestItemTurretAmmoMap = {};

/**
 * Describe a requirement
 *
 * @param {string} category  liquid, item, power
 * @param {Object} type      Liquid, Item, null
 * @param {number} amount    Amount
 */
function ResourcesRequirement(category, type, amount) {
    this.category = category;
    this.type = type;
    this.amount = amount;
}

/**
 * Describe a factory
 *
 * @param {number} craftTime  time
 * @param {ResourcesRequirement[]} requirements craft resources usage
 * @param {Item[]} factoryRequirements          factory requirements
 */
function FactoryInfo(craftTime, requirements, factoryRequirements) {
    this.craftTime = craftTime;
    this.requirements = requirements;
    this.factoryRequirements = factoryRequirements;
}

/**
 * 尝试初始化物品价值列表，最值钱的放在前面。
 * 
 * （不保证在其他 Mod 中也准确）
 * 
 * 首先资源基础价值 = 工厂所需其他材料；
 * 然后要加上制作它所需的资源，包括物品、热量、液体、电力、生产速度。
 * 从游戏经验来看，资源需求对资源价值的影响大概是：
 * - 需求种类越多越麻烦，铜铅钛硅四种资源直接增大了蓝图难度，同时需要热量、液体、物品的难度
 * - 数量需求，如产一个 phase fabric 所需的巨大的沙子需求，经常跑满整个传输体系
 * - 生产速度，比如碳化物非常缓慢的产生速度
 */
function initItemValueList() {
    const map = {};
    const factoryMap = {};
    function getRequirementGroup(type) {
        let c = factoryMap[type];
        if (c == undefined) {
            c = [];
            factoryMap[type] = c;
        }
        return c;
    }
    // 1. find ore or floor, calculate by hardness (beryllum and tungsten are special)
    let i;
    i = content.blocks.iterator();
    blockloop:
    while (i.hasNext()) {
        let block = i.next();
        if (block.itemDrop) {
            if (block.itemDrop == Items.beryllium) {
                map.put(block.itemDrop, Item.coal.hardness);
            } else if (block.itemDrop == Items.tungsten) {
                map.put(block.itemDrop, Item.titanium.hardness);
            } else if (block.itemDrop == Items.graphite) {
                map.put(block.itemDrop, Item.titanium.hardness);
            } else {
                map.put(block.itemDrop, block.itemDrop.hardness);
            }
        }
        // 2. get all factories
        if (block instanceof GenericCrafter) {
            let reqs = [];
            let craftTime = block.craftTime;
            let factoryRequirements = [];
            let resourcesKink = 0;
            // 1 heat = 30 power
            // 1 power = 1/60
            let heat = block.heatRequirement;
            for (let requirement of block.requirements) {
                factoryRequirements.add(requirement.item);
            }
            for (let consume of block.nonOptionalConsumers) {
                if (consume instanceof ConsumeItems) {
                    for (let citem of consume.items) {
                        reqs.add(ResourcesRequirement("item", citem.item, citem.amount));
                    }
                } else if (consume instanceof ConsumeLiquids) {
                    for (let cliquid of consume.liquids) {
                        reqs.add(ResourcesRequirement("liquid", cliquid.liquid, cliquid.amount));
                    }
                } else if (consume instanceof ConsumeLiquid) {
                    reqs.add(ResourcesRequirement("liquid", consume.liquid, consume.amount));
                } else if (consume instanceof ConsumePower) {
                    reqs.add(ResourcesRequirement("power", null, consume.usage));
                }
            }
            let info = FactoryInfo(craftTime, reqs, factoryRequirements);
            let cost = 0;

            if (block.outputLiquids) {
                for (let liquid of block.outputLiquids) {
                    getRequirementGroup(liquid).push(info);
                }
            }
            if (block.outputItems) {
                for (let item of block.outputItems) {
                    // TODO if factory require it self, exclude this factory
                    getRequirementGroup(item).push(info);
                }
            }
        } else if (block instanceof Separator) {
            for (let r of block.results) {
                if (!map[r.item]) {
                    factoryMap[r.item] = block;
                }
            }
        }
    }

    // 2. find

    i = content.items.iterator();
    while (i.hasNext()) {
        let item = i.next();

    }
}

/**
 * Fill blocks with resources
 * 
 * @param {SmartFiller} filler The Smart Filler
 * @param {Building} b         Building to fill
 */
function fillBuilding(filler, b) {
    const block = b.block;
    // turret
    if (b instanceof BaseTurret.BaseTurretBuild) {
        // fill collant
        if (block.coolant != null) {
            let c = bestTurretCoolantMap[block];
            if (!c) {
                // find best collant to that type of turret
                let bestLiquid = "";
                let bestLiquidHeatCapacity = 0;
                let i = content.liquids().iterator();
                while (i.hasNext()) {
                    let liquid = i.next();
                    if(!block.consumesLiquid(liquid)) continue;
                    if (bestLiquid == null || liquid.heatCapacity > bestLiquidHeatCapacity) {
                        bestLiquid = liquid;
                        bestLiquidHeatCapacity = liquid.heatCapacity;
                    }
                }
                c = bestLiquid;
                bestTurretCoolantMap[block] = c;
            }

            if (c != "") {
                b.handleLiquid(filler, c, block.liquidCapacity);
            }
        }

        if (b instanceof ItemTurret.ItemTurretBuild) {
            // fill with best ammo
            let t = bestItemTurretAmmoMap[block];
            if (!t) {
                // find best ammo
                let bestAmmo = "";
                let bestAmmoStrength = 0;

                let i = content.items().iterator();
                while (i.hasNext()) {
                    let item = i.next();
                    if (!block.consumesItem(item)) {
                        continue;
                    }
                    
                }
                t = bestAmmo;
                bestItemTurretAmmoMap[block] = t;
            }
            if (t != "") {
                b.handleStack(t, block.itemCapacity, filler);
            }
        }
        return;
    } else if (b instanceof StorageBlock.StorageBuild) {
        // fill everything
        if (block.coreMerge && b.linkedCore != null) {
            // fill cores
            let i = content.items().iterator();
            while (i.hasNext()) {
                let item = i.next();
                let fill = b.linkedCore.storageCapacity - b.linkedCore.items.get(item);
                if (fill > 0) {
                    b.items.add(fill);
                    if (net.server() || !net.active() && b.team == state.rules.defaultTeam && state.isCampaign()) {
                        state.rules.sector.info.handleCoreItem(item, fill);
                    }
                }
            }
        } else {
            // fill normal vault
            let i = content.items().iterator();
            while (i.hasNext()) {
                let item = i.next();
                let fill = b.block.itemCapacity - b.items.get(item);
                if (fill > 0) {
                    b.items.add(item, fill);
                }
            }
        }
    }
}

const blockType = extend(Block, "smart-filler", {

    drawPlace(x, y, rotation, valid) {
        x *= tilesize;
        y *= tilesize;

        Drawf.dashSquare(baseColor, x, y, range * tilesize);
        indexer.eachBlock(Vars.player.team(), Tmp.r1.setCentered(x, y, range * tilesize), b => true, t => {
            let c = Tmp.c1.set(baseColor);
            c.a = Mathf.absin(4, 1);
            Drawf.selected(t, c)
        });
    },
});

blockType.buildType = prov(() => {
    const targets = new Seq();
    let lastChange = -2;

    function updateTargets(that) {
        targets.clear();
        taken.clear();
        indexer.eachBlock(that.team, Tmp.r1.setCentered(that.x, that.y, range * tilesize),
                b => true, b => {
                    // keep fillable building
                    if (b.block.hasItems || b.block.hasLiquids) {
                        targets.add(b);
                    }
                });
    }

    return new JavaAdapter(Building, {

        updateTile() {
            if(lastChange != world.tileChanges) {
                lastChange = world.tileChanges;
                updateTargets(this);
            }

            let i = targets.iterator();
            while (i.hasNext()) {
                let t = i.next();
                fillBuilding(this, t);
            }
        },
    });
});
