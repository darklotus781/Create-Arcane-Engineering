// priority: 0

function painterText(x, y, color, text) {
    return {
        type: 'text',
        text: text ? text.toString() : 'placeholder',
        scale: 1,
        color: color ? color : 'dark_purple',
        x: x,
        y: y,
        alignX: 'left',
        alignY: 'bottom',
        draw: 'always',
        visible: false,
        shadow: true
    }
}
onEvent('client.logged_in', event =>{
    event.player.paint({
        currentMana: painterText(40, -20),
        maxMana: painterText(64, -20),
        currentCrystal: painterText(40, -20, "light_purple"),
        maxCrystal: painterText(64, -20, "light_purple"),
        sourceGemMana: painterText(40, -20, "light_purple")
    })
})
onEvent('item.tooltip', event =>{
	event.addAdvanced("kubejs:everlasting_mana_crystal", (item, advanced, text) => {
        text.add(1, "Stores Source for you to use. Cannot break.")
		if (item.nbt) {
            if (item.nbt.storedSource) {
                text.add(2, Component.join("", [Component.darkPurple("Stored Source: "), Component.lightPurple(Math.round(item.nbt.storedSource).toString()), Component.darkPurple("/2000")]))
            } else {
                text.add(2, Component.darkPurple("Stored Source: 0/2000"))
            }
        } else {
            text.add(2, Component.darkPurple("Stored Source: 0/2000"))
        }
	})
    event.addAdvanced("kubejs:cursed_mana_crystal", (item, advanced, text) => {
        text.add(1, Component.join(" ", [Component.gray("Can be bound to a Source Jar."), Component.of("25%"), Component.gray("Conversion efficiency.")]))
		if (item.nbt) {
            let {bound, curse, hideCurse, storedSource} = item.nbt
            if (bound) {
                text.add(2, Component.join("", [Component.gray("Bound to: "), Component.of(bound.x.toString()), Component.gray(", "), Component.of(bound.y.toString()), Component.gray(", "), Component.of(bound.z.toString()), Component.gray(" In: "), Component.of(bound.dim)]))
            } else {text.add(2, Component.of("Not Bound yet."))}
            if (curse) {
                let hideCurseBool = hideCurse ? true : false
                if (curse == 0) {text.add(3, Component.join(" ", [Component.darkRed("Curse:"), Component.of("None")]))}
                else if (curse == 1) {text.add(3, Component.join(" ", [Component.darkGray("Curse:").bold(), Component.darkRed("Mana Loss").bold().obfuscated(hideCurseBool)]))}
                else if (curse == 2) {text.add(3, Component.join(" ", [Component.darkGray("Curse:").bold(), Component.darkRed("Mana Corruption").bold().obfuscated(hideCurseBool)]))}
                else if (curse == 3) {text.add(3, Component.join(" ", [Component.darkGray("Curse:").bold(), Component.darkRed("Mana Instability").bold().obfuscated(hideCurseBool)]))}
            } else {text.add(3, Component.darkPurple("Curse not revealed yet."))}
            if (storedSource) {
                text.add(4, Component.join(" ", [Component.gray("Source:"), Component.lightPurple(storedSource)]))
            } else {text.add(4, Component.join(" ", [Component.gray("Source:"), Component.darkPurple("0")]))}
        } else {
            text.add(2, Component.of("Not Bound yet."))
            text.add(3, Component.gray("Curse not revealed yet."))
            text.add(4, Component.join(" ", [Component.gray("Source:"), Component.darkPurple("0")]))
        }
	})
    event.addAdvanced('kubejs:fine_tuned_source_relay', (item, advanced, text) => {
        text.add(1, "Allows to Configure Gem usage while casting Spells. Rightclick to cycle Modes.")
        if (item.nbt) {
            if (item.nbt.mode == 0) {text.add(2, Component.join(" ", [Component.of("Mode:"), Component.darkPurple("1/4;"), Component.darkPurple("Disabled")]))}
            else if (item.nbt.mode == 1) {
                text.add(2, Component.join(" ", [Component.of("Mode:"), Component.darkPurple("2/4;"), Component.lightPurple("Blocks Gems from being used")]))
                text.add(3, Component.darkPurple("Also hides Gem Mana from numeric mana values"))
            }
            else if (item.nbt.mode == 2) {text.add(2, Component.join(" ", [Component.of("Mode:"), Component.darkPurple("3/4;"), Component.lightPurple("Double Cast to confirm Gem usage")]))}
            else if (item.nbt.mode == 3) {
                text.add(2, Component.join(" ", [Component.of("Mode:"), Component.darkPurple("4/4;"), Component.lightPurple("Use Source Gems before other Mana")]))
                text.add(3, Component.lightPurple(" Doubles the Mana value of Source Gems"))
            }
            else if (item.nbt.mode == 4) {text.add(2, Component.join(" ", [Component.of("Mode:"), Component.darkPurple("5/4;"), Component.darkPurple("Maybe?")]))}
        } else {
            text.add(2, Component.join(" ", [Component.of("Mode:"), Component.darkPurple("Disabled")]))
        }
    })
    Ingredient.of("#ars_nouveau:casting_devices").stacks.forEach(one => {
        event.addAdvanced(one.id, (item, advanced, text) => {
            if (item.nbt) {
                if (item.nbt.brittle) {
                    text.add(1, "Overwriting the inscribed spell may break this item.")
                }
            }
        })
    })
})

//event.player.fullNBT.ForgeCaps["ars_nouveau:mana"]