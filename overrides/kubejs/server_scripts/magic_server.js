// priority: 0
global.tick = 0

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

function updateSlots(event) {
	let crystalSlot = -1
	if (getCurioSlot(event.player, "gem") == undefined) {
		let everlasting = event.player.inventory.find(Item.of("kubejs:everlasting_mana_crystal").ignoreNBT())
		let cursed = event.player.inventory.find(Item.of("kubejs:cursed_mana_crystal").ignoreNBT())
		if (everlasting != -1) {crystalSlot = everlasting} 
		else {crystalSlot = cursed}
	}
	event.player.nbt.putInt("crystalSlot", crystalSlot)
	event.player.nbt.putInt("tuneSlot", event.player.inventory.find(Item.of("kubejs:fine_tuned_source_relay").ignoreNBT()))
}

function updateAureal(event, setTo, key) {
	let keys = ["Aureal", "Corruption", "CorruptionTimer"]
	if (!keys.includes(key)) {key = keys[0]} 
	let data = event.player.fullNBT
	let vars = []

	notSoPersistantVars.forEach(element => {
		vars.push([element, event.player.nbt.getInt(element)])
	})
	if (key == keys[0]) {
		data.ForgeCaps["forbidden_arcanus:aureal"].Aureal = setTo
	} else if (key == keys[1]) {
		data.ForgeCaps["forbidden_arcanus:aureal"].Corruption = setTo
	} else if (key == keys[2]) { 
		data.ForgeCaps["forbidden_arcanus:aureal"].CorruptionTimer = setTo
	}
	event.player.mergeFullNBT(data)
	vars.forEach(element => {
		event.player.nbt.putInt(element[0], element[1])
	})
}

function updateCurrentMana(event, setTo) {//takes a sec or two to visually update
	let data = event.player.fullNBT
	let vars = []
	notSoPersistantVars.forEach(element => {
		vars.push([element, event.player.nbt.getInt(element)])
	})
	data.ForgeCaps["ars_nouveau:mana"].current = setTo
	event.player.mergeFullNBT(data)
	vars.forEach(element => {
		event.player.nbt.putInt(element[0], element[1])
	})
}

function updateMana(event) {
	let currentMana = event.player.fullNBT.ForgeCaps["ars_nouveau:mana"].current
	let updatedMana = currentMana
	let gems = event.player.inventory.count(Item.of('ars_nouveau:source_gem').ignoreNBT())
	let tGems = event.player.nbt.getInt("totalGems")

	let manaMode = event.player.nbt.getInt("manaMode")
	if (manaMode == 1) {gems = 0} //don't count gems if tuned to deny them	

	let tuneMode = 0
	let tuneSlot = event.player.nbt.getInt("tuneSlot")

	if (tuneSlot != -1) {
		let tuneItem = event.player.inventory.get(tuneSlot)
		if (tuneItem.id != "kubejs:fine_tuned_source_relay") {
			updateSlots(event)
		} else {
			if (!tuneItem.nbt) {tuneItem.setNbt({mode: Number.parseInt(0)})}
			tuneMode = tuneItem.nbt.mode
		}
	}
	let crystalMana = event.player.nbt.getInt("crystalMana")
	let crystalSlot = event.player.nbt.getInt("crystalSlot")
	let crystalCurse = 0
	if (crystalSlot == -1 && getCurioSlot(event.player, "gem") == undefined && event.player.nbt.getInt("crystalMana")) {
		updateSlots(event)
		updateCurrentMana(event, currentMana - crystalMana)
		event.player.nbt.putInt("crystalMana", 0)
	}
	if (crystalSlot != -1 || getCurioSlot(event.player, "gem") != undefined) {
		let crystalItem
		let modifiedCrystalItem = false
		if (getCurioSlot(event.player, "gem") != undefined) {
			crystalItem = getCurioSlot(event.player, "gem")
		} else {
			crystalItem = event.player.inventory.get(crystalSlot)
		}  // in case 
		
		if (crystalItem.id == "kubejs:cursed_mana_crystal"){
			if (!crystalItem.nbt) {
				crystalItem.setNbt({storedSource: Number.parseInt(0)})
				modifiedCrystalItem = true
			}
			if (crystalItem.nbt.bound) {
				let {bound, curse} = crystalItem.nbt
				crystalCurse = curse
				let boundMana = Math.floor(event.server.getLevel(bound.dim).getBlock(bound.x, bound.y, bound.z).getEntityData().getFloat("source")/(curse == 1 ? 8 : 4))
				if (boundMana != crystalMana) {
					crystalItem.nbt.storedSource = boundMana
					modifiedCrystalItem = true
				}
				if (curse == 2) {
					updateAureal(event, 0, "CorruptionTimer")
				}
			}
	 	}
		if (crystalItem.id != "kubejs:everlasting_mana_crystal" && crystalItem.id != "kubejs:cursed_mana_crystal") {
			updateSlots(event)
			updateCurrentMana(event, currentMana - crystalMana)
			event.player.nbt.putInt("crystalMana", 0)
		} else {
			if (!crystalItem.nbt) {
				crystalItem.setNbt({storedSource: Number.parseInt(0)})
				modifiedCrystalItem = true
			}
			let crystalStored = crystalItem.nbt.storedSource
			if (crystalCurse == 3) {
				let ownMana = currentMana - crystalMana
				if (global.tick % 10 == 0) {
					let incr = Math.floor(crystalStored / 25)
					if (crystalItem.nbt.cursebool == undefined) {
						crystalItem.nbt.cursebool = true
						modifiedCrystalItem = true
					}
					if (crystalItem.nbt.cursebool) {
						crystalMana += incr
						updatedMana += incr
					} else {
						crystalMana -= incr
						updatedMana -= incr
					}
					if (crystalMana <= 4 * incr) {
						crystalItem.nbt.cursebool = true //idk why this doesnt work for true but works for false...
						if (crystalSlot != -1) { event.player.inventory.get(crystalSlot).nbt.cursebool = true }
						crystalMana = 4 * incr
						updatedMana = crystalMana + ownMana //setting is only possible because any changes before this are meant to get overridden
						modifiedCrystalItem = true
					} else if (crystalMana >= crystalStored + 1 - incr) {
						crystalItem.nbt.cursebool = false
						crystalMana = crystalStored
						updatedMana = crystalMana + ownMana //see comment above
						modifiedCrystalItem = true
					} else if (Math.random() <= 0.03) {
						if (crystalSlot != -1) {
							event.player.inventory.get(crystalSlot).nbt.cursebool = !crystalItem.nbt.cursebool
						} else {
							modifiedCrystalItem = true
							crystalItem.nbt.cursebool = !crystalItem.nbt.cursebool
						}
					}
					event.player.nbt.putInt("crystalMana", crystalMana)
					if (modifiedCrystalItem && getCurioSlot(event.player, "gem") != undefined) { //update Curio Crystal item via command (i hate it)
						event.server.runCommandSilent(`curios replace gem 0 ${event.player.name.text} with ${crystalItem.id}${crystalItem.nbt}`)
					}
				}
			} else if (crystalMana != crystalStored) {
				updatedMana += crystalStored - crystalMana
				event.player.nbt.putInt("crystalMana", crystalStored)
			}
		}
		if (modifiedCrystalItem && getCurioSlot(event.player, "gem") != undefined) { //update Curio Crystal item via command (i hate it)
			event.server.runCommandSilent(`curios replace gem 0 ${event.player.name.text} with ${crystalItem.id}${crystalItem.nbt}`)
		}
	} 
	if (crystalCurse != event.player.nbt.getInt("crystalCurse")) {
		event.player.nbt.putInt("crystalCurse", crystalCurse)
	}
	if (tuneMode != manaMode) {
		let gemMana = 20
		if (manaMode == 3) {gemMana = 40}

		if (tuneMode == 3) { //both gems and tGems are 0 when gems are disabled.
			updatedMana += 40*tGems - gemMana*tGems
		} else{
			updatedMana += 20*tGems - gemMana*tGems
		}
		event.player.nbt.putInt("manaMode", tuneMode)
	} else if (gems != tGems) {
		let gemMana = 20
		if (manaMode == 3) {gemMana = 40}

		updatedMana += gemMana * (gems - tGems)
		event.player.nbt.putInt("totalGems", gems)
	}
	if (currentMana != updatedMana) {
		if (currentMana > updatedMana) {
			updateCurrentMana(event, updatedMana)
		} else {
			event.server.scheduleInTicks(1, c => {
				updateCurrentMana(event, updatedMana)
			})
		}
		
	}
}

onEvent('player.tick', event => { //all this needs to go in startup manacalc at some point
	if (global.tick % 5 == 0) {
		if (event.player.getOpenInventory().getClass().getSimpleName() != "CuriosContainer") {
			updateMana(event)
		}
	}
})

onEvent('player.inventory.changed', event => {
	if (event.player.getOpenInventory().getClass().getSimpleName() != "CuriosContainer") {
		updateSlots(event)
	}
})

onEvent('block.right_click', event => {
	if (event.player.nbt.getBoolean("spellConfirm") && !event.item.hasTag("ars_nouveau:show_mana")) {
		event.player.nbt.putBoolean("spellConfirm", false)
	}
	// filling/emptying everlasting mana crystals
	if (event.item == "kubejs:everlasting_mana_crystal" && event.block == "ars_nouveau:source_jar" ) {
		if (!event.item.nbt) {event.getItem().setNbt({storedSource: Number.parseInt(0)})}
		let source = event.block.getEntityData().getFloat("source")
		let stored = event.item.nbt.storedSource
		if (!event.player.crouching) {
			event.getItem().nbt.storedSource += source/2
			if (event.item.nbt.storedSource > 2000) {
				event.block.mergeEntityData('\{source:' + Number.parseFloat((event.item.nbt.storedSource - 2000)*2) + '\}')
				event.getItem().nbt.storedSource = 2000
			} else {
				event.block.mergeEntityData('\{source:' + Number.parseFloat(0) + '\}')
			}
		} else {
			if (source + 2*stored > 10000) {
				event.block.mergeEntityData('\{source:' + Number.parseFloat(10000) + '\}')
				event.getItem().nbt.storedSource = (2*stored + source - 10000)/2
			} else {
				event.block.mergeEntityData('\{source:' + Number.parseFloat(2*stored + source) + '\}')
				event.getItem().nbt.storedSource = 0
			}
		}
	}
	// linking cursed mana crystals
	if (event.item == "kubejs:cursed_mana_crystal" && event.block == "ars_nouveau:source_jar" && event.player.crouching) {
		if (!event.item.nbt) {event.item.setNbt({storedSource: 0})}
		let {x, y, z} = event.block.pos
		event.item.nbt.bound = {}
		event.item.nbt.bound.x = x
		event.item.nbt.bound.y = y
		event.item.nbt.bound.z = z
		event.item.nbt.bound.dim = event.player.level.dimension.toString()
		if (!event.item.nbt.curse) {
			event.item.nbt.curse = Math.floor(Math.random()*3+1)
			event.item.nbt.hideCurse = true
		}
		let {bound, curse} = event.item.nbt
		event.item.nbt.storedSource = event.server.getLevel(bound.dim).getBlock(bound.x, bound.y, bound.z).getEntityData().getFloat("source")/(curse == 1 ? 8 : 4)
		event.player.setStatusMessage(Component.join(" ", [Component.of("Bound the Crystal to "), Component.of(x), Component.of(y), Component.of(z)]).darkRed())
	}
	// breaking Makeshift Enchanter's Items
	if (event.block == "ars_nouveau:scribes_table" && event.item.hasTag("ars_nouveau:spell_books")) {
		let blck = event.block
		if (blck.properties.part == "foot") {
			blck = event.block.offset(blck.properties.facing)
		}
		let item = Item.of(blck.getEntityData().itemStack.id, blck.getEntityData().itemStack.tag)
		if (item.hasTag("ars_nouveau:casting_devices") && item.nbt) {
			if (item.nbt.ars_nouveau_spellCaster) {
				if (item.nbt.brittle && item.nbt.ars_nouveau_spellCaster.spell_1 && Math.random() <= 0.33) {
					event.player.tell("ITEM broke")
					blck.mergeEntityData({itemStack: {}})
				}
			}
		}
	}
})
onEvent('item.right_click', event => {
	if (event.hand != MAIN_HAND) {return}

	if (event.item == "kubejs:fine_tuned_source_relay") {
		if (!event.item.nbt) {
			event.getItem().setNbt({mode: Number.parseInt(1)})
		} else {
			if (event.player.crouching) {
				event.getItem().nbt.mode--
				if (event.item.nbt.mode < 0) {
					event.item.nbt.mode = 3
				}
			} else {
				event.getItem().nbt.mode++
				if (event.item.nbt.mode > Number.parseInt(3)) {
					event.item.nbt.mode = 0
				}
			}
		}
	}
	/*
	if (event.player.offHandItem == "ars_nouveau:source_gem") {
		if (!event.item.nbt) {event.getItem().setNbt({storedSource: Number.parseInt(0)})}
		event.getItem().nbt.storedSource += Number.parseInt(500)
		event.player.tell(event.item)
	}
	*/
})

onEvent('player.chat', (event) => {
	if (Math.round(event.message) != NaN) {
		event.player.tell("### New MANA: " + Math.round(event.message))
		updateCurrentMana(event, Math.round(event.message))
	}
})

onEvent("server.tick", event => {
	global.tick++
	if (global.tick >= 1000) {
		global.tick = 0
	}
})

onEvent("player.logged_in", event => { // setting vars to be wrong, then fixing them
	event.player.nbt.putInt("totalGems", 0)
	event.player.nbt.putInt("crystalMana", 0)
	updateSlots(event)
	updateMana(event)
})

onEvent('tags.items', event => {
	event.add("ars_nouveau:spell_books", /^ars_nouveau:.*spell_book/)
	event.add("ars_nouveau:casting_devices", ['ars_nouveau:wand', 'ars_nouveau:spell_bow', 'ars_nouveau:enchanters_sword', 'ars_nouveau:enchanters_mirror', 'ars_elemental:spell_horn'])
	event.add("ars_nouveau:show_mana", ['ars_nouveau:wand', 'ars_nouveau:spell_bow', 'ars_nouveau:enchanters_sword', 'ars_nouveau:enchanters_mirror', 'ars_elemental:spell_horn', /^ars_nouveau:.*spell_book/])
	//event.add("curios:head", "minecraft:gold_ingot")
	event.add("curios:gem", ["kubejs:everlasting_mana_crystal", "kubejs:cursed_mana_crystal"])
	event.add("curios:head", "kubejs:mana_glasses")
})

onEvent('recipes', event => {
	event.shaped(Item.of('ars_nouveau:spell_bow', {brittle:true}).withName(Component.of("Makeshift Enchanter's Bow").italic(false)), 
		[
			"GIN",
			"I  ",
			"N  "
		], 
		{
			G: "ars_nouveau:source_gem",
			I: "minecraft:gold_ingot",
			N: "minecraft:gold_nugget"
		}
	)
	event.shaped(Item.of('ars_nouveau:enchanters_sword', {brittle:true}).withName(Component.of("Makeshift Enchanter's Sword").italic(false)),
		[
			" G ",
			" G ",
			" I "
		], 
		{
			G: "ars_nouveau:source_gem",
			I: "minecraft:gold_ingot"
		}
	)
	event.shaped(Item.of('ars_nouveau:enchanters_mirror', {brittle:true}).withName(Component.of("Makeshift Enchanter's Mirror").italic(false)),
		[
			"NNN",
			"NRN",
			" A "
		], 
		{
			A: "ars_nouveau:archwood_planks",
			R: "forbidden_arcanus:runic_glass_pane",
			N: "minecraft:gold_nugget"
		}
	)
	event.shaped(Item.of('ars_nouveau:wand', {brittle:true}).withName(Component.of("Makeshift Casting Wand").italic(false)),
		[
			" NG",
			" AN",
			"I  "
		], 
		{
			A: "ars_nouveau:archwood_planks",
			G: "ars_nouveau:source_gem",
			I: "minecraft:gold_ingot",
			N: "minecraft:gold_nugget"
		}
	)
	event.shaped(Item.of('ars_elemental:spell_horn', {brittle:true}).withName(Component.of("Makeshift Enchanter's Horn").italic(false)),
		[
			"   ",
			"IHN",
			" NI"
		], 
		{
			H: "ars_nouveau:wilden_horn",
			I: "minecraft:gold_ingot",
			N: "minecraft:gold_nugget"
		}
	)
})

onEvent('player.tick', event =>{ // Numerical Mana Painting
	if (global.tick % 5 != 2) {return} // timing, fires 2 ticks after mana gets updated
    if (event.player.mainHandItem.hasTag("ars_nouveau:show_mana") || event.player.offHandItem.hasTag("ars_nouveau:show_mana") || event.player.fullNBT.ForgeCaps["ars_nouveau:mana"].current <= event.player.fullNBT.ForgeCaps["ars_nouveau:mana"].max) {
        let crystalMana = event.player.nbt.getInt("crystalMana")
		let crystalItem = Item.of("minecraft:air")
		if (crystalMana) {
			if (getCurioSlot(event.player, "gem")) {
				crystalItem = getCurioSlot(event.player, "gem")
			} else if (event.player.nbt.getInt("crystalSlot") != -1) {
				crystalItem = event.player.inventory.get(event.player.nbt.getInt("crystalSlot"))
			}
		}
		let maxCrystalMana //different values for different crystals. Can not be regenerated. Actual Max mana from them is just what they have stored.
		if (crystalItem.id == "kubejs:everlasting_mana_crystal") {
			maxCrystalMana = 2000
		} else if (crystalItem.nbt) {
			if (crystalItem.nbt.curse == 1) {
				maxCrystalMana = 1250
			} else {
				maxCrystalMana = 2500
			}
		}
        let bonusMana = 20 * event.player.inventory.count(Item.of('ars_nouveau:source_gem').ignoreNBT())
        let current = Math.round(event.player.fullNBT.ForgeCaps["ars_nouveau:mana"].current)
        let tuneMode = 0
        let tuneSlot = event.player.inventory.find(Item.of("kubejs:fine_tuned_source_relay").ignoreNBT())

        if (tuneSlot != -1) {tuneMode = event.player.inventory.get(tuneSlot).nbt.mode}

        if (tuneMode == 1) {bonusMana = 0} else if (tuneMode == 3) {bonusMana = bonusMana*2}

        let max = event.player.fullNBT.ForgeCaps["ars_nouveau:mana"].max - bonusMana - crystalMana

		if ((getCurioSlot(event.player, "head") && getCurioSlot(event.player, "head").id == "kubejs:mana_glasses") || event.player.inventory.find("kubejs:mana_glasses") != -1) {
			let ownMana = (current - crystalMana - bonusMana)
			let ownY = -20
			let sourceGemY = -20
			if (bonusMana) {
				ownY -= 9
			}
			if (tuneMode == 3) {
				sourceGemY -= 9
				ownY += 9
			}
			if (crystalMana) {
				sourceGemY -= 9
				ownY -= 9
			}
			event.player.paint({
				currentMana: {text: ownMana.toString(), x: 64 - ownMana.toString().length*6, y: ownY, color: "dark_purple", visible:true},
				maxMana: {text: "/" + max.toString(), y: ownY, color: "dark_purple", visible: true}, 
				sourceGemMana:{text: "(+" + bonusMana + ")", x: 60 - bonusMana.toString().length*3, y: sourceGemY, visible:bonusMana},
				currentCrystal: {text: crystalMana.toString(), x: 64 - crystalMana.toString().length*6, visible: crystalMana},
				maxCrystal: {text: "/" + maxCrystalMana, visible: crystalMana}
			})
		} else {
			event.player.paint({
				currentMana: {text: current.toString(), x: 64 - current.toString().length*6, y: -20, color: bonusMana || crystalMana ? 'light_purple' : 'dark_purple', visible:true},
				maxMana: {text: "/" + max.toString(), y: -20, color: crystalMana ? "light_purple" : "dark_purple", visible: true}, 
				sourceGemMana:{text: "(+" + bonusMana + ")", x: 76 + max.toString().length*6, y: -20, visible:bonusMana},
				currentCrystal: {visible:false},
				maxCrystal: {visible:false}
			})
		}
    } else {
        event.player.paint({
            maxMana: {visible:false, color: "dark_purple"}, 
            currentMana: {visible:false, color: "dark_purple"}, 
            currentCrystal: {visible:false},
            maxCrystal: {visible:false},
            sourceGemMana: {visible:false}
        })
    }
})