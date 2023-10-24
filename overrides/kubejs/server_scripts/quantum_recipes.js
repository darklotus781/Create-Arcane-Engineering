onEvent('recipes', event => {
    event.remove({id: 'ae2:quantum_ring'})
    event.remove({id: 'ae2:network/blocks/quantum_ring'})
    event.remove({id: 'ae2:quantum_link'})
    event.remove({id: 'ae2:network/blocks/quantum_link'})

    // Nether Star Dust
    event.recipes.createCrushing(Item.of(KJ('nether_star_dust')).withChance(0.25), [Item.of(MC('nether_star'), 1)])

    // Nether Star Plate
    let t = KJ('nether_star_dust');
    event.recipes.createSequencedAssembly([
        KJ('nether_star_plate'),
    ], KJ('nether_star_dust'), [
        event.recipes.createDeploying(t, [t, MC('red_sand')]), // What else is red sand good for?
        event.recipes.createFilling(t, [t, Fluid.of('integrateddynamics:menril_resin', 250)]),
        event.recipes.createFilling(t, [t, Fluid.of(KJ('aureal_essence'), 250)]),
        event.recipes.createFilling(t, [t, Fluid.of(TC('liquid_soul'), 250)]),
        event.recipes.createFilling(t, [t, Fluid.of(KJ('liquid_resent'), 250)]),
        event.recipes.createDeploying(t, [t, MC('soul_sand')]),
        event.recipes.createDeploying(t, [t, 'pneumaticcraft:glycerol']), // Adhesive, LOL
        event.recipes.createPressing(t, t)
    ]).transitionalItem(t).loops(8)

    // Quantum Mechanisms from Nether Stars and processing.
    t = KJ('incomplete_quantum_mechanism');
    event.recipes.createSequencedAssembly([
        KJ('quantum_mechanism'),
    ], KJ('nether_star_plate'), [
        event.recipes.createDeploying(t, [t, 'forbidden_arcanus:stellarite_piece']),
        event.recipes.createDeploying(t, [t, KJ('warp_fragments')]),
        event.recipes.createDeploying(t, [t, AE2('singularity')]),
        event.recipes.createDeploying(t, [t, KJ('runic_tablet')]),
        event.recipes.createFilling(t, [t, Fluid.of('tconstruct:molten_enderium', 1000)]),
        event.recipes.createDeploying(t, [t, 'forbidden_arcanus:eternal_stella']),
        event.recipes.createPressing(t, t)
    ]).transitionalItem(t).loops(1)

    // ME Quantum Ring from Quantum Mechanisms and a Particle Accelerator
    event.recipes.createMechanicalCrafting(Item.of(AE2('quantum_ring'), 1), [
        'DDDDDDDDD',
        'DQQQQQQQD',
        'DQDDDDDQD',
        'DQD   DQD',
        'DQD   DQD',
        'DQD   DQD',
        'DQDDDDDQD',
        'DQQQQQQQD',
        'DDDDDDDDD',
    ], {
        Q: KJ('quantum_mechanism'),
        D: 'ae2:dense_energy_cell',
    })
    // // ME Quantum Ring from Quantum Mechanisms and a Particle Accelerator
    // event.recipes.createMechanicalCrafting(Item.of(AE2('quantum_ring'), 1), [
    //     'QQQQQQQ',
    //     'QSDCDSQ',
    //     'QDBPZDQ',
    //     'QCEAECQ',
    //     'QDZPBDQ',
    //     'QSDCDSQ',
    //     'QQQQQQQ'
    // ], {
    //     Q: KJ('quantum_mechanism'),
    //     P: 'cae:particle_accelerator',
    //     A: 'cae:arcanereactor',
    //     S: 'pneumaticcraft:solar_cell',
    //     E: 'quark:ender_watcher',
    //     C: 'ae2:condenser',
    //     D: 'ae2:dense_energy_cell',
    //     B: 'ae2:matter_ball',
    //     Z: 'ae2:singularity'
    // })

    // ME Quantum Link
    event.recipes.createMechanicalCrafting(Item.of(AE2('quantum_link'), 1), [
        'QQQQQQQ',
        'QGGGGGQ',
        'QGHRHGQ',
        'QGRWRGQ',
        'QGHRHGQ',
        'QGGGGGQ',
        'QQQQQQQ'
    ], {
        R: AE2('quantum_ring'),
        Q: KJ('quantum_mechanism'),
        G: AE2('quartz_vibrant_glass'),
        H: 'quark:diamond_heart',
        W: 'waystones:warp_stone'
    })
})