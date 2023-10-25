// priority: 0

//Just some testing with Ars events
const ArsAPI = java('com.hollingsworth.arsnouveau.api.ArsNouveauAPI')
//console.log(ArsAPI.getInstance().getSpellpartMap())

let notSoPersistantVars = [ //all of kubes persistent data gets voided on nbt merge. This is a workaround.
	"totalGems",
	"manaMode",
	"crystalMana",
	"tuneSlot",
	"crystalSlot",
	"crystalCurse"
]

function getCurioSlot(player, slot) {
	let item = undefined
	player.fullNBT.ForgeCaps["curios:inventory"].Curios.forEach(curioSlot => {
		if (curioSlot.Identifier == slot) {
			if (curioSlot.StacksHandler.Stacks.Items[0] != undefined) {
				item = Item.of(curioSlot.StacksHandler.Stacks.Items[0].id, curioSlot.StacksHandler.Stacks.Items[0].tag)
			}
		}
	})
	return item
}

//since when do these events not exist in probe anymore :/
onForgeEvent('com.hollingsworth.arsnouveau.api.event.SpellCastEvent', event =>{
	//event.world.server.asKJS().tell('§3Fired Event!:§r  com.hollingsworth.arsnouveau.api.event.SpellCastEvent')
	//event.entity.asKJS().tell(event.entity.asKJS().player.mainHandItem.id)

	//Disabling the novice spellbook from manually casting
	// [!] Offhand-Casting needs fixing [!]
	if (event.entity.asKJS().player.mainHandItem.id == "ars_nouveau:novice_spell_book") {
		event.setCanceled(true)
	}

	//Variables to decide on spell-cost distribution
	let currentMana = event.entity.asKJS().player.fullNBT.ForgeCaps["ars_nouveau:mana"].current
	let maxMana = event.entity.asKJS().player.fullNBT.ForgeCaps["ars_nouveau:mana"].max
	let gemMana = 20
	let crystalMana = event.entity.asKJS().player.nbt.getInt("crystalMana")
	let gemFirst = false
	let corruption = event.entity.asKJS().player.fullNBT.ForgeCaps["forbidden_arcanus:aureal"].Corruption
	console.log(corruption)
	if (event.entity.asKJS().player.nbt.getInt("manaMode") == 3) {
		gemMana = 40
		gemFirst = true
	}
	let gemBonus = gemMana * event.entity.asKJS().player.nbt.getInt("totalGems")
	let noGemMana = currentMana > gemBonus ? currentMana - gemBonus : 0
	let ownMana = noGemMana - crystalMana

	//Changing Spellcost
		//multiplying cost by x for each spell count double (eg. split)
	const pierceCost = 20
	const splitCost = 20
	const costMultiplier = 1.75
	let cost = event.spell.getCastingCost()
	let pierceCount = event.spell.getBuffsAtIndex(Number.parseInt(0), event.shooter, ArsAPI.getInstance().getSpellpartMap().pierce)
	let splitCount = event.spell.getBuffsAtIndex(Number.parseInt(0), event.shooter, ArsAPI.getInstance().getSpellpartMap().split)

	event.entity.asKJS().tell(Component.join(" ", [Component.darkAqua("initCost: "), Component.of(cost), Component.darkAqua("    Split+Pierce: "), Component.of(pierceCount+splitCount)]))

	event.spell.cost = (cost - (pierceCount*pierceCost+splitCount*splitCost)) * (costMultiplier ** (pierceCount+splitCount))
	cost = event.spell.getCastingCost()

	event.entity.asKJS().tell(Component.join(" ", [Component.darkAqua("Spellcost: "), Component.of(cost)]))
/*	event.entity.asKJS().tell(Component.join(" ", [Component.aqua("Discount: "), Component.of(event.spell.discount)]))
	event.entity.asKJS().tell(Component.join(" ", [Component.darkAqua("Discounted Spellcost: "), Component.of(event.spell.getDiscountedCost())]))
*/	//idiot me read the source code for latest version ars nouveau

	
	//Calculating mana usage distribution between different storages (player, crystal, sourcegems)
	// Note: Mana is used before the cap updates; cost should never be changed
	let toTake = 0

	if (gemFirst && gemBonus) { //if Gems are used before own mana; => Use gems
		// [!] Edge Case: if cost is greater than (gemMana + ownMana), CrystalMana could be used without getting removed from the crystal Item [!]
		toTake = Math.round(gemBonus > cost? cost/gemMana + 0.49 : gemBonus/gemMana)
	} else if (cost > ownMana) {
		if (crystalMana) {
			let crystalSlot = -1
			let everlasting = event.entity.asKJS().player.inventory.find(Item.of("kubejs:everlasting_mana_crystal").ignoreNBT())
			let cursed = event.entity.asKJS().player.inventory.find(Item.of("kubejs:cursed_mana_crystal").ignoreNBT())
			if (everlasting != -1) {crystalSlot = everlasting} 
			else {crystalSlot = cursed}

			let crystalItem
			if (getCurioSlot(event.entity.asKJS().player, "gem") != undefined) {
				crystalItem = getCurioSlot(event.entity.asKJS().player, "gem")
			} else {
				crystalItem = event.entity.asKJS().player.inventory.get(crystalSlot)
			}
			
			if (cost > noGemMana) {
				crystalItem.nbt.storedSource = 0
				if (crystalSlot == cursed && crystalItem.nbt.bound) {
					let {bound} = crystalItem.nbt
					event.entity.asKJS().server.getLevel(bound.dim).getBlock(bound.x, bound.y, bound.z).mergeEntityData('\{source:' + 0 + '\}')
				}
				event.entity.asKJS().player.nbt.putInt("crystalMana", 0)
				toTake = Math.round((cost - noGemMana)/gemMana + 0.49) //always rounding upwards, sorry for your sourcegem loss
			} else {
				if (crystalSlot == cursed && crystalItem.nbt.bound) {
					let {bound, curse, storedSource} = crystalItem.nbt
					event.entity.asKJS().server.getLevel(bound.dim).getBlock(bound.x, bound.y, bound.z).mergeEntityData('\{source:' + Number.parseFloat((storedSource - cost)*(curse == 1 ? 8 : 4)) + '\}')
					if (curse == 2) { //i hate that i have to do this for every nbt merge
						let data = event.entity.asKJS().player.fullNBT
						let vars = []
						notSoPersistantVars.forEach(element => {
							vars.push([element, event.entity.asKJS().player.nbt.getInt(element)])
						})
						data.ForgeCaps["forbidden_arcanus:aureal"].Corruption = corruption + Math.floor((cost-75 + Math.random()*175) /200)
						event.entity.asKJS().player.mergeFullNBT(data)
						vars.forEach(element => {
							event.entity.asKJS().player.nbt.putInt(element[0], element[1])
						})
					}
				}
				crystalItem.nbt.storedSource = crystalMana - (cost - ownMana)
				event.entity.asKJS().player.nbt.putInt("crystalMana", crystalMana - (cost - ownMana))
			}
			if (getCurioSlot(event.entity.asKJS().player, "gem") != undefined) { //update Curio Crystal item via command (i hate it)
				event.entity.asKJS().server.runCommandSilent(`curios replace gem 0 ${event.entity.asKJS().player.name.text} with ${crystalItem.id}${crystalItem.nbt}`)
			}
		} else {
			toTake = Math.round((cost - noGemMana)/gemMana + 0.49)
		}
	}
	if (corruption) {
		let corruptionAdded = Math.floor((Math.random()*40 + corruption - 20)/30)
		console.log(corruptionAdded)
		console.log(corruptionAdded)
		if (toTake + corruptionAdded >= gemBonus/gemMana) {
			toTake = gemBonus/gemMana
		} else {
			toTake += corruptionAdded
		}
	}
	if (toTake) {
		event.entity.asKJS().tell(Component.join(" ", [Component.darkAqua("Gems to Shatter: "), Component.of(toTake)]))
		if (event.entity.asKJS().player.creativeMode) {
			event.entity.asKJS().player.setStatusMessage(Component.join(" ", [Component.darkPurple("Casting this spell would have cost you"), Component.lightPurple(toTake), Component.darkPurple("Source Gems")]))
			return
		} else if ((event.entity.asKJS().player.nbt.getInt("manaMode") == 2 && event.entity.asKJS().player.nbt.getBoolean("spellConfirm") == false )) {
			event.entity.asKJS().player.setStatusMessage(Component.join(" ", [Component.darkPurple("Casting this spell would cost you"), Component.lightPurple(toTake), Component.darkPurple("Source Gems. \nCast again to Confirm.")]))
			event.entity.asKJS().player.nbt.putBoolean("spellConfirm", true)
			event.setCanceled(true)
			return
		}
	} else {
		event.entity.asKJS().player.nbt.putBoolean("spellConfirm", false)
	}
	event.entity.asKJS().player.nbt.putInt("totalGems", (gemBonus/gemMana) - toTake)
	for (let i = 0; i < toTake; i++) {
		event.entity.asKJS().player.server.scheduleInTicks(i+1, c =>{
			event.entity.asKJS().player.playSound('block.glass.break')
		})
		/*
		if (Math.random()*8 <= 1) { // 1/8 chance to give a source gem frag when shattered
			event.entity.asKJS().player.give("kubejs:source_gem_fragment")
		}
		*/
	}
	while (toTake > 0) {
		let slotAmt = event.entity.asKJS().player.inventory.get(event.entity.asKJS().player.inventory.find(Item.of('ars_nouveau:source_gem').ignoreNBT())).count
		if (toTake <= slotAmt) {
			event.entity.asKJS().player.inventory.extract(event.entity.asKJS().player.inventory.find(Item.of('ars_nouveau:source_gem').ignoreNBT()), toTake, false)
			toTake = 0
			break
		}
		event.entity.asKJS().player.inventory.extract(event.entity.asKJS().player.inventory.find(Item.of('ars_nouveau:source_gem').ignoreNBT()), slotAmt, false)
		toTake -= slotAmt
	}
})

onForgeEvent('com.hollingsworth.arsnouveau.api.event.EffectResolveEvent$Pre', event =>{
	//event.world.server.asKJS().tell('§3Fired Event!:§r  com.hollingsworth.arsnouveau.api.event.EffectResolveEvent$Pre')
})
onForgeEvent('com.hollingsworth.arsnouveau.api.event.SpellResolveEvent$Pre', event =>{ //Really just unimportant testing for things that could make the use of spells more important
    //event.world.server.asKJS().tell('§3Fired Event!:§r  com.hollingsworth.arsnouveau.api.event.SpellResolveEvent$Pre')
	console.log("Location: " + event.rayTraceResult.getLocation())
	let blck = event.world.asKJS().getBlock(event.rayTraceResult.getLocation()) 
	console.log("|| |  |   |     |   |  | ||   Block: " + blck)
	console.log("SpellCost: " + event.spell.getCastingCost())
	console.log("Distance to Shooter: " + event.rayTraceResult.distanceTo(event.shooter))
	//event.world.server.asKJS().tell("§9Distance to Shooter: " + event.rayTraceResult.distanceTo(event.shooter))
	let castingCost = event.spell.getCastingCost()

	console.log("Recipe: " + event.spell.recipe)
	let glyphs = []
	event.spell.recipe.forEach(Spell =>{
		console.log(Spell.getGlyph())
		glyphs.push(Spell.getGlyph())
		if (Spell.getGlyph() == "glyph_sensitive") {console.log("CHECK!")}
	})


	if (blck.id == "ars_nouveau:source_jar") {
		console.log("Found Source Jar. Filling Process:")
		console.log("Old Source: " + blck.getEntityData().getFloat("source"))
		console.log("Casting Cost: " + castingCost)
		console.log("BUFF TEST")
		console.log("Pierce:  " + event.spell.getBuffsAtIndex(Number.parseInt(0), event.shooter, ArsAPI.getInstance().getSpellpartMap().pierce))
		console.log("Split:  " + event.spell.getBuffsAtIndex(Number.parseInt(0), event.shooter, ArsAPI.getInstance().getSpellpartMap().split))
		console.log(event.spell.recipe)

		let oldSource = blck.getEntityData().getFloat("source")
		let pierce = event.spell.getBuffsAtIndex(Number.parseInt(0), event.shooter, ArsAPI.getInstance().getSpellpartMap().pierce)
		let split = event.spell.getBuffsAtIndex(Number.parseInt(0), event.shooter, ArsAPI.getInstance().getSpellpartMap().split)

		let newSource = oldSource + (castingCost/(split+1))/(pierce+1)

		console.log("New Source: " + newSource)
		if (newSource >= 10000){ newSource = 10000}
		if (newSource >= blck.getEntityData().getFloat("source")) {
			blck.mergeEntityData('\{source:' + Number.parseFloat(newSource) + '\}')
		}
		//blck.setBlockState("fill", 0) //thought this would update the block, but it crashes the game
		event.setCanceled(true)
	}



	if (true) { //idk why, but some cases this is needed and some others it just works
		if (event.rayTraceResult.getLocation().x() % 1 == 0 && !blck.blockState.isFaceSturdy(event.world.asKJS().minecraftLevel, blck.pos, Direction.east)) {
			blck = event.world.asKJS().getBlock(event.rayTraceResult.getLocation().add(-0.5, 0, 0))
		}
		if (event.rayTraceResult.getLocation().y() % 1 == 0 && !blck.blockState.isFaceSturdy(event.world.asKJS().minecraftLevel, blck.pos, Direction.up)) {
			blck = event.world.asKJS().getBlock(event.rayTraceResult.getLocation().add(0, -0.5, 0))
		}
		if (event.rayTraceResult.getLocation().z() % 1 == 0 && !blck.blockState.isFaceSturdy(event.world.asKJS().minecraftLevel, blck.pos, Direction.south)) {
			blck = event.world.asKJS().getBlock(event.rayTraceResult.getLocation().add(0, 0, -0.5))
		}
	}
	event.world.server.asKJS().tell("§3Block: §r" + blck)
	glyphs.forEach(glyph =>{
		if (glyph == "glyph_sensitive" && blck == "minecraft:stone") {blck.set("minecraft:diamond_block")}
	})
	console.log("\n- - - - - - - - - -\n|\n- - - - - - - - - -")
})


onForgeEvent('com.hollingsworth.arsnouveau.api.event.ManaRegenCalcEvent', event => {
	//event.entity.asKJS().tell('§3Fired Event!:§r  com.hollingsworth.arsnouveau.api.event.ManaRegenCalcEvent')
	//let corruption = event.entity.asKJS().player.fullNBT.ForgeCaps["forbidden_arcanus:aureal"].Corruption //crashes from this on probejs dump????
	let corruption = 0
	let initialRegen = event.getRegen()
	let logRegen = initialRegen
	if (corruption >= 60) {
		logRegen = 0
		event.setRegen(Number.parseInt(0))
	} else {
		logRegen = event.getRegen()*(60-corruption)/60
		event.setRegen(event.getRegen()*(60-corruption)/60)
	}
	event.entity.asKJS().setStatusMessage(initialRegen + "  --->  " + logRegen + "  =>  " + event.getRegen())	
	//event.setRegen(Number.parseInt(0)) // testing with no regen

})
onForgeEvent('com.hollingsworth.arsnouveau.api.event.MaxManaCalcEvent', event =>{
	//event.entity.asKJS().tell('§3Fired Event!:§r  com.hollingsworth.arsnouveau.api.event.MaxManaCalcEvent')
	//event.entity.asKJS().tell(event.entity.asKJS().player.mainHandItem)
	//event.entity.asKJS().tell(event.max)

	//event.entity.asKJS().tell()
	
	// Apparently this isnt replaceable. //nevermind i am just stupid
	let mana = event.max

	let gems = event.entity.asKJS().player.nbt.getInt("totalGems")
	if (gems) {
		if (event.entity.asKJS().player.nbt.getInt("manaMode") == 3) {
			mana += (40 * gems)
		} else {
			mana += (20 * gems)
		}
	}
	let crystalMana = event.entity.asKJS().player.nbt.getInt("crystalMana")
	if (crystalMana) {
		mana += crystalMana
	}
	event.setMax(mana)
	//event.entity.asKJS().player.setStatusMessage("§7Old: §f" +  old  + "   §7Now: §f" + (old + (20 * event.entity.asKJS().player.inventory.count(Item.of('ars_nouveau:source_gem').ignoreNBT()))) + "   §7NBT: §f" + event.entity.asKJS().player.fullNBT.ForgeCaps["ars_nouveau:mana"].max)
	
})

onEvent('item.registry', event => {
	event.create('everlasting_mana_crystal').unstackable()
	event.create('cursed_mana_crystal').unstackable()
	event.create('fine_tuned_source_relay').unstackable()
	event.create('source_gem_fragment')
	event.create('mana_glasses').unstackable()
})