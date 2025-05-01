
const lib = require('super-cheat/lib')

const InvincibleForceFieldAbility = (radius, regen, max, cooldown) => {

    var realRad;
    var paramUnit;
    var paramField;
    var shieldConsumer = cons(trait => {
        if (trait.team != paramUnit.team
            && trait.type.absorbable
            && Intersector.isInsideHexagon(paramUnit.x, paramUnit.y, realRad * 2, trait.x, trait.y)
            && paramUnit.shield > 0) {

            trait.absorb();
            Fx.absorb.at(trait);

            paramField.alpha = 1;
        }
    });

    const ability = new JavaAdapter(ForceFieldAbility, {
        update(unit) {
            unit.shield = Infinity;
            this.radiusScale = Mathf.lerpDelta(this.radiusScale, 1, 0.06)
            realRad = this.radiusScale * this.radius;
            paramUnit = unit;
            paramField = this;
            Groups.bullet.intersect(unit.x - realRad, unit.y - realRad, realRad * 2, realRad * 2, shieldConsumer);
            this.alpha = Math.max(this.alpha - Time.delta / 10, 0);
        },
        copy() {
            return InvincibleForceFieldAbility(radius, regen, max, cooldown);
        },
        draw(unit) {
            this.super$draw(unit);
        },
    }, radius, regen, max, cooldown);

    return ability;
};

const invincibleBulletType = (() => {

    const bt = extend(PointBulletType, {
        hitEntity(b, other, initialHealth) {
            if (other && other.kill) {
                Call.unitDestroy(other.id)
            }
        },
        hitTile(b, tile, x, y, health, direct)  {
            this.super$hitTile(b, tile, x, y, health, direct) ;
            if (tile) {
                tile.killed()
            }
        },
    });

    const tailEffectTime = 12;
    const trialEffect = lib.newEffect(tailEffectTime, e => {
        let fx = Angles.trnsx(e.rotation, 24)
        let fy = Angles.trnsy(e.rotation, 24)
        Lines.stroke(3 * e.fout(), Pal.spore);
        Lines.line(e.x, e.y, e.x + fx, e.y + fy);

        Drawf.light(e.x, e.y, 60 * e.fout(), Pal.spore, 0.5);
    });
    const hitEffect = lib.newEffect(8, (e) => {
        Draw.color(Pal.spore);
        Lines.stroke(e.fout() * 1.5);

        Angles.randLenVectors(e.id, 8, e.finpow() * 22, lib.floatc2((x, y) => {
            let ang = Mathf.angle(x, y);
            Lines.lineAngle(e.x + x, e.y + y, ang, e.fout() * 4 + 1);
        }));
    });
    const shootEffect = lib.newEffect(8, (e) => {
        Draw.color(Pal.spore, Pal.reactorPurple, e.fin());
        let w = 1.0 + 5 * e.fout();
        Drawf.tri(e.x, e.y, w, 15 * e.fout(), e.rotation);
        Drawf.tri(e.x, e.y, w, 3 * e.fout(), e.rotation + 180);
    });
    const smokeEffect = lib.newEffect(8, (e) => {
        Draw.color(Pal.spore, Pal.reactorPurple, Pal.reactorPurple2, e.fin());

        Angles.randLenVectors(e.id, 5, e.finpow() * 6, e.rotation, 20, (x, y) => {
            Fill.circle(e.x + x, e.y + y, e.fout() * 1.5);
        });
    });

    bt.damage = Infinity;
    // bt.splashDamage = Infinity;
    bt.speed = 600;
    // bt.hitSize = 6;
    // bt.width = 9;
    // bt.height = 45;
    bt.lifetime = 1;
    bt.inaccuracy = 0
    bt.keepVelocity = false
    bt.trailSpacing = 20
    bt.hitShake = 0.3
    bt.shootEffect = shootEffect
    bt.smokeEffect = smokeEffect
    bt.despawnEffect = hitEffect
    bt.hitEffect = hitEffect
    bt.trailEffect = trialEffect
    return bt;
})();

const invincibleWeapon = (() => {

    const w = extend(Weapon, {});

    w.name = lib.modName + '-' + 'invincible-ship-weapon';
    w.length = 1.5;
    w.reload = 10;
    // w.ejectEffect = Fx.shellEjectSmall;
    w.bullet = invincibleBulletType;
    w.rotate = true;
    w.rotateSpeed = 20;
    w.x = 3;
    w.y = 2;
    return w;
})();

const mech = (() => {
    const m = extend(UnitType, 'invincible-ship', {});

    m.abilities.add(new RepairFieldAbility(Infinity, 60, 8 * 8));
    // m.abilities.add(new JavaAdapter(ForceFieldAbility, {}, 60, Infinity, Infinity, 300));
    m.abilities.add(InvincibleForceFieldAbility(60, Infinity, Infinity, 300));
    m.constructor = prov(() => extend(UnitTypes.alpha.constructor.get().class, {
        damage(amount) { },
    }));
    m.defaultController = prov(() => new BuilderAI());

    m.weapons.add(invincibleWeapon);
    m.flying = true;
    m.speed = 120;
    m.hitSize = 16;
    m.accel = 0.01;
    m.rotateSpeed = 20;
    m.baseRotateSpeed = 20;
    // m.boostMultiplier = 3;
    // m.canBoost = false;
    m.drag = 0.1;
    m.mass = 31210;
    m.shake = 3;
    m.health = 10;
    m.mineSpeed = 50000;
    m.mineTier = 2147483647;
    m.buildSpeed = Infinity;
    m.itemCapacity = 9999;
    m.canHeal = false;
    m.engineOffset = 5;
    m.engineSize = 3;
    m.rotateShooting = false;
    m.payloadCapacity = (200 * 200) * (8 * 8);
    m.ammoCapacity = 200000000;
    m.ammoResupplyAmount = 1;
    m.commandLimit = 30;
    // m.weaponOffsetY = -2;
    // m.weaponOffsetX = 5;
    m.coreUnitDock = true;
    m.mineWalls = true;
    m.envDisabled = 0;
    m.fogRadius = 80;

    return m;
})();

exports.invincibleShip = mech;
