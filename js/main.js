$(window).load(function() {

var weapon_base_data, master_categories, master_craft_values;
var cur_master_category;

var extract_or_default = function(str, regex, def) {
    var match = regex.exec(str);
    if (match === null) return def;
    match.shift();
    return match;
}

var extract_or_default_num = function(str, regex, def) {
    return extract_or_default(str, regex, def).map(parseFloat);
}
    
var update_dps = function() {
    // Get data from form.
    var data = $.trim($("#weapon-data").val());
    var orig_data = data;
    var craft_quality = $("#craft-quality")[0].checked;
    var craft_inc_phys = parseInt($("#craft-inc-phys").val()) || 0;
    var craft_min_phys = parseInt($("#craft-min-add-phys").val()) || 0;
    var craft_max_phys = parseInt($("#craft-max-add-phys").val()) || 0;
    var craft_min_fire = parseInt($("#craft-min-add-fire").val()) || 0;
    var craft_max_fire = parseInt($("#craft-max-add-fire").val()) || 0;
    var craft_min_cold = parseInt($("#craft-min-add-cold").val()) || 0;
    var craft_max_cold = parseInt($("#craft-max-add-cold").val()) || 0;
    var craft_min_lightning = parseInt($("#craft-min-add-lightning").val()) || 0;
    var craft_max_lightning = parseInt($("#craft-max-add-lightning").val()) || 0;
    var craft_inc_as = parseInt($("#craft-inc-as").val()) || 0;
    var craft_inc_crit = parseInt($("#craft-inc-crit").val()) || 0;
    
    // Extract base weapon.
    if (data == "") {
        $("#crafting-presets p").removeClass("active");
        return;
    }
    var data_lines = data.split("\n");
    var base_names = Object.keys(weapon_base_data);
    base_names.sort(function(a, b) { return b.length - a.length; });
    var base_data = data_lines[1] + " " + data_lines[2];
    var base_name = null;
    var base_names_len = base_names.length;
    for (var i = 0; i < base_names_len; i++) {
        if (base_data.indexOf(base_names[i]) > -1) {
            base_name = base_names[i];
            break;
        }
    }
    
    if (base_name === null) {
        $("#output").text("Unknown weapon base type or invalid data.");
        $("#crafting-presets p").removeClass("active");
        return;
    }
    var base_stats = weapon_base_data[base_name];
    
    cur_master_category = master_categories[base_stats[0]];
    $("#crafting-presets p").addClass("active");
    if (cur_master_category == "bow" || cur_master_category == "wand") {
        $("#master-craft-inc-as2").removeClass("active");
    }
    
    // Global phys damage implicit screws up calculation below, remove it.
    var implicit = base_stats[8];
    if (implicit == "Physical Damage +%") {
        data = data.replace(base_stats[9].toString() + "% increased Physical Damage\n", "");
    }
    
    var ilvl = extract_or_default_num(data, /^Item Level: (\d+)$/m, [0])[0];
    var phys_range = base_stats[2].split("-").map(parseFloat);
    var atk_speed = parseFloat(base_stats[3]);
    var quality = extract_or_default_num(data, /^Quality: \+(\d+)%/m, [0])[0];
    var inc_phys_range = extract_or_default_num(data, /^Adds (\d+)-(\d+) Physical Damage$/m, [0, 0]);
    var inc_fire_range = extract_or_default_num(data, /^Adds (\d+)-(\d+) Fire Damage$/m, [0, 0]);
    var inc_cold_range = extract_or_default_num(data, /^Adds (\d+)-(\d+) Cold Damage$/m, [0, 0]);
    var inc_lightning_range = extract_or_default_num(data, /^Adds (\d+)-(\d+) Lightning Damage$/m, [0, 0]);
    var inc_phys = extract_or_default_num(data, /^(\d+)% increased Physical Damage$/m, [0])[0];
    var inc_as = extract_or_default_num(data, /(\d+)% increased Attack Speed$/m, [0])[0];
    var aug_crit = extract_or_default_num(data, /^Critical Strike Chance: (\d+(?:\.\d+)?)%/m, [0])[0];
    
    var tot_crit_mod = 1;
    var crit_re = /^(\d+)% increased Critical Strike Chance$/gm;
    var m;
    while (m = crit_re.exec(data)) {
        tot_crit_mod *= 1 + parseInt(m[0]) / 100;
    }
    var base_crit = Math.round(aug_crit / tot_crit_mod * 10) / 10;
    
    // User crafting input.
    if (craft_quality) quality = 20;
    inc_phys += craft_inc_phys;
    inc_phys_range[0] += craft_min_phys; inc_phys_range[1] += craft_max_phys;
    inc_fire_range[0] += craft_min_fire; inc_fire_range[1] += craft_max_fire;
    inc_cold_range[0] += craft_min_cold; inc_cold_range[1] += craft_max_cold;
    inc_lightning_range[0] += craft_min_lightning; inc_lightning_range[1] += craft_max_lightning;
    inc_as += craft_inc_as;
    tot_crit_mod *= 1 + craft_inc_crit / 100;
    
    var tot_phys_mult = 1 + (quality + inc_phys) / 100;
    var tot_phys_min = tot_phys_mult * (phys_range[0] + inc_phys_range[0]);
    var tot_phys_max = tot_phys_mult * (phys_range[1] + inc_phys_range[1]);
    var tot_phys_avg = (tot_phys_min + tot_phys_max) / 2;
    var tot_ele_min = inc_fire_range[0] + inc_cold_range[0] + inc_lightning_range[0];
    var tot_ele_max = inc_fire_range[1] + inc_cold_range[1] + inc_lightning_range[1];
    var tot_ele_avg = (tot_ele_min + tot_ele_max) / 2;
    var tot_as = atk_speed * (100 + inc_as) / 100;
    var phys_dps = tot_phys_avg * tot_as;
    var ele_dps = tot_ele_avg * tot_as;
    var tot_dps = phys_dps + ele_dps;
    var out = "";
    
    var s = JSON.stringify;
    var r = function(min, max) { return s(Math.round(min)) + "-" + s(Math.round(max)); };
    out += "Base: " + base_name + "\n";
    out += "Item Level: " + ilvl + "\n";
    out += "Quality: " + s(quality) + "\n";
    if (tot_phys_min || tot_phys_max) {
        out += "Physical Damage: " + r(tot_phys_min, tot_phys_max) + "\n";
    }
    if (inc_fire_range[0] || inc_fire_range[1]) {
        out += "Fire Damage: " + r(inc_fire_range[0], inc_fire_range[1]) + "\n";
    }
    if (inc_cold_range[0] || inc_cold_range[1]) {
        out += "Cold Damage: " + r(inc_cold_range[0], inc_cold_range[1]) + "\n";
    }
    if (inc_lightning_range[0] || inc_lightning_range[1]) {
        out += "Lightning Damage: " + r(inc_lightning_range[0], inc_lightning_range[1]) + "\n";
    }
    if (tot_ele_min || tot_ele_max) out += "Total Elemental Damage: " + r(tot_ele_min, tot_ele_max) + "\n";
    out += "Critical Strike Chance: " + (base_crit * tot_crit_mod).toFixed(2) + "%\n";
    out += "Attacks per Second: " + tot_as.toFixed(2) + "\n";
    
    out += "pDPS: " + phys_dps.toFixed(1) + "\n";
    out += "eDPS: " + ele_dps.toFixed(1) + "\n";
    out += " DPS: " + tot_dps.toFixed(1) + "\n";
    $("#output").text(out);
};

$("#calc-container :input").on("change keyup paste", update_dps);

$("#weapon-data").focus(function() {
    if (this.value === this.defaultValue) this.value = '';
}).blur(function() {
    if (this.value === '') this.value = this.defaultValue;
});

var update_form_val = function(scale, basetype) {
    var val;
    if (cur_master_category in master_craft_values[basetype]) {
    	val = master_craft_values[basetype][cur_master_category];
    } else {
        val = master_craft_values[basetype]["default"];
    }
    if (scale == "min") val = val[0];
    if (scale == "max") val = val[1];
    if (scale == "avg") val = Math.floor((val[0] + val[1]) / 2);
    var el = $("#craft-" + basetype.replace("2", ""));
    el.val(val.toString());
};

$("#crafting-presets a").click(function(e) {
    e.preventDefault();
    var btn = $(e.target);
    var scale = btn.text().toLowerCase();
    var type = btn.parent().attr("id");
    var basetype = type.replace("master-craft-", "");
    if (basetype.indexOf("add-", 0) > -1) {
        update_form_val(scale, "min-" + basetype);
        update_form_val(scale, "max-" + basetype);
    } else {
        update_form_val(scale, basetype);
    }
    update_dps();
});

$("#craft-reset").click(function() {
    $("#user-input-right input[type=number]").val("0");
	update_dps();
});

master_categories = {
    "Bow": "bow",
    "Claw": "onehand",
    "Dagger": "onehand",
    "One Hand Axe": "onehand",
    "One Hand Mace": "onehand",
    "One Hand Sword": "onehand",
    "Sceptre": "onehand",
    "Staff": "twohand",
    "Thrusting One Hand Sword": "onehand",
    "Two Hand Axe": "twohand",
    "Two Hand Mace": "twohand",
    "Two Hand Sword": "twohand",
    "Wand": "wand"
};

master_craft_values = {
    "inc-phys": { "default": [40, 59] },
    "inc-phys2": { "default": [60, 79] },

    "min-add-phys": {
        "default": [7, 9],
        "twohand": [10, 13],
        "bow": [10, 13]
    },

    "max-add-phys": {
        "default": [13, 16],
        "twohand": [20, 25],
        "bow": [20, 25]
    },

    "min-add-phys2": {
        "default": [10, 13],
        "twohand": [14, 18],
        "bow": [14, 18]
    },

    "max-add-phys2": {
        "default": [17, 20],
        "twohand": [26, 31],
        "bow": [26, 31]
    },

    "min-add-fire": { "default": [10, 13], "twohand": [15, 20] },
    "max-add-fire": { "default": [20, 23], "twohand": [30, 35] },
    "min-add-fire2": { "default": [15, 19], "twohand": [22, 29] },
    "max-add-fire2": { "default": [29, 34], "twohand": [43, 51] },
    
    "min-add-cold": { "default": [8, 11], "twohand": [13, 17] },
    "max-add-cold": { "default": [16, 19], "twohand": [24, 28] },
    "min-add-cold2": { "default": [12, 16], "twohand": [18, 24] },
    "max-add-cold2": { "default": [23, 28], "twohand": [35, 41] },
    
    "min-add-lightning": { "default": [1, 4], "twohand": [2, 4] },
    "max-add-lightning": { "default": [34, 36], "twohand": [52, 55] },
    "min-add-lightning2": { "default": [1, 4], "twohand": [3, 6] },
    "max-add-lightning2": { "default": [50, 52], "twohand": [70, 79] },

    "inc-as": { "default": [8, 11], "bow": [7, 12], "wand": [7, 12] },
    "inc-as2": { "default": [12, 15] },
    "inc-crit": { "default": [17, 21] },
    "inc-crit2": { "default": [22, 27] },
};

weapon_base_data = {"index":["Class","Level","Damage","Attacks per second","DPS","Req Str","Req Dex","Req Int","Implicit Mods","Mod Values"],
"Crude Bow":["Bow","1","4-9","1.4","9.1","0","14","0","",""],
"Short Bow":["Bow","5","4-13","1.5","12.8","0","26","0","",""],
"Long Bow":["Bow","10","6-23","1.3","18.9","0","41","0","",""],
"Composite Bow":["Bow","15","11-26","1.3","24.1","0","56","0","",""],
"Recurve Bow":["Bow","20","12-36","1.25","30","0","71","0","",""],
"Bone Bow":["Bow","24","12-37","1.35","33.1","0","83","0","",""],
"Royal Bow":["Bow","28","10-41","1.45","37","0","95","0","Weapon Elemental Damage +%","6-12"],
"Death Bow":["Bow","32","20-53","1.2","43.8","0","107","0","Local Critical Strike Chance +%","30-50"],
"Grove Bow":["Bow","35","15-44","1.5","44.3","0","116","0","",""],
"Reflex Bow":["Bow","36","27-40","1.4","46.9","0","124","0","Base Movement Velocity +%","4"],
"Decurve Bow":["Bow","38","17-70","1.25","54.4","0","125","0","",""],
"Compound Bow":["Bow","41","24-56","1.3","52","0","134","0","",""],
"Sniper Bow":["Bow","44","23-68","1.25","56.9","0","143","0","",""],
"Ivory Bow":["Bow","47","21-64","1.35","57.4","0","152","0","",""],
"Highborn Bow":["Bow","50","17-66","1.45","60.2","0","161","0","Weapon Elemental Damage +%","6-12"],
"Decimation Bow":["Bow","53","31-81","1.2","67.2","0","170","0","Local Critical Strike Chance +%","30-50"],
"Thicket Bow":["Bow","56","22-66","1.5","66","0","179","0","",""],
"Steelwood Bow":["Bow","57","40-60","1.4","70","0","190","0","Base Movement Velocity +%","4"],
"Citadel Bow":["Bow","58","25-101","1.25","78.8","0","185","0","",""],
"Ranger Bow":["Bow","60","34-79","1.3","73.5","0","212","0","",""],
"Assassin Bow":["Bow","62","30-89","1.25","74.4","0","212","0","",""],
"Spine Bow":["Bow","64","27-80","1.35","72.2","0","212","0","",""],
"Imperial Bow":["Bow","66","19-78","1.45","70.3","0","212","0","Weapon Elemental Damage +%","6-12"],
"Harbinger Bow":["Bow","68","35-91","1.2","75.6","0","212","0","Local Critical Strike Chance +%","30-50"],
"Maraketh Bow":["Bow","71","44-65","1.4","76.3","0","222","0","Base Movement Velocity +%","6"],
"Nailed Fist":["Claw","3","4-9","1.6","10.4","0","11","11","Local Life Gain Per Target","3"],
"Sharktooth Claw":["Claw","7","6-15","1.4","14.7","0","14","20","Local Life Gain Per Target","6"],
"Awl":["Claw","12","6-20","1.5","19.5","0","25","25","Local Life Gain Per Target","5"],
"Cat's Paw":["Claw","17","10-19","1.6","23.2","0","39","27","Local Life Leech From Physical Damage %","1.6"],
"Blinder":["Claw","22","10-27","1.5","27.8","0","41","41","Local Life Gain Per Target","10"],
"Timeworn Claw":["Claw","26","14-36","1.3","32.5","0","39","56","Local Life Leech From Physical Damage %","2"],
"Sparkling Claw":["Claw","30","12-32","1.6","35.2","0","64","44","Local Life Gain Per Target","10"],
"Fright Claw":["Claw","34","9-37","1.5","34.5","0","61","61","Local Life Leech From Physical Damage %","2"],
"Double Claw":["Claw","36","13-40","1.5","39.8","0","67","67","Local Life And Mana Gain Per Target","6"],
"Thresher Claw":["Claw","37","18-48","1.3","42.9","0","53","77","Local Life Gain Per Target","21"],
"Gouger":["Claw","40","13-46","1.5","44.3","0","70","70","Local Life Gain Per Target","13"],
"Tiger's Paw":["Claw","43","21-38","1.6","47.2","0","88","61","Local Life Leech From Physical Damage %","1.6"],
"Gut Ripper":["Claw","46","18-48","1.5","49.5","0","80","80","Local Life Gain Per Target","21"],
"Prehistoric Claw":["Claw","49","23-61","1.3","54.6","0","69","100","Local Life Leech From Physical Damage %","2"],
"Noble Claw":["Claw","52","19-50","1.6","55.2","0","105","73","Local Life Gain Per Target","18"],
"Eagle Claw":["Claw","55","14-56","1.5","52.5","0","94","94","Local Life Leech From Physical Damage %","2"],
"Twin Claw":["Claw","57","20-60","1.5","60","0","103","103","Local Life And Mana Gain Per Target","10"],
"Great White Claw":["Claw","58","27-70","1.3","63.1","0","81","117","Local Life Gain Per Target","34"],
"Throat Stabber":["Claw","60","19-65","1.5","63","0","113","113","Local Life Gain Per Target","21"],
"Hellion's Paw":["Claw","62","27-51","1.6","62.4","0","131","95","Local Life Leech From Physical Damage %","1.6"],
"Eye Gouger":["Claw","64","23-61","1.5","63","0","113","113","Local Life Gain Per Target","31"],
"Vaal Claw":["Claw","66","27-72","1.3","64.4","0","95","131","Local Life Leech From Physical Damage %","2"],
"Imperial Claw":["Claw","68","22-57","1.6","63.2","0","131","95","Local Life Gain Per Target","25"],
"Terror Claw":["Claw","70","15-60","1.5","56.3","0","113","113","Local Life Leech From Physical Damage %","2"],
"Gemini Claw":["Claw","72","21-63","1.5","63","0","121","121","Local Life And Mana Gain Per Target","14"],
"Glass Shank":["Dagger","1","3-10","1.5","9.8","0","9","6","Critical Strike Chance +%","40"],
"Skinning Knife":["Dagger","5","4-16","1.3","13","0","16","11","Critical Strike Chance +%","40"],
"Carving Knife":["Dagger","10","2-22","1.4","16.8","0","18","26","Critical Strike Chance +%","40"],
"Stiletto":["Dagger","15","6-23","1.5","21.8","0","30","30","Critical Strike Chance +%","40"],
"Boot Knife":["Dagger","20","8-30","1.4","26.6","0","31","45","Critical Strike Chance +%","40"],
"Copper Kris":["Dagger","24","10-39","1.2","29.4","0","28","60","Critical Strike Chance +%","80"],
"Skean":["Dagger","28","9-37","1.45","33.4","0","42","60","Critical Strike Chance +%","40"],
"Imp Dagger":["Dagger","32","12-49","1.2","36.6","0","36","78","Critical Strike Chance +%","60"],
"Flaying Knife":["Dagger","35","14-56","1.2","42","0","73","51","Critical Strike Chance +%","40"],
"Prong Dagger":["Dagger","36","13-51","1.3","41.6","0","55","77","Monster Base Block %","4"],
"Butcher Knife":["Dagger","38","6-54","1.4","42","0","55","79","Critical Strike Chance +%","40"],
"Poignard":["Dagger","41","12-48","1.5","45","0","72","72","Critical Strike Chance +%","40"],
"Boot Blade":["Dagger","44","14-55","1.4","48.3","0","63","90","Critical Strike Chance +%","40"],
"Golden Kris":["Dagger","47","16-65","1.2","48.6","0","51","110","Critical Strike Chance +%","80"],
"Royal Skean":["Dagger","50","15-59","1.45","53.7","0","71","102","Critical Strike Chance +%","40"],
"Fiend Dagger":["Dagger","53","19-76","1.2","57","0","58","123","Critical Strike Chance +%","60"],
"Trisula":["Dagger","55","19-74","1.3","60.5","0","89","106","Monster Base Block %","4"],
"Gutting Knife":["Dagger","56","21-84","1.2","63","0","113","78","Critical Strike Chance +%","40"],
"Slaughter Knife":["Dagger","58","9-78","1.4","60.9","0","81","117","Critical Strike Chance +%","40"],
"Ambusher":["Dagger","60","17-67","1.5","63","0","113","113","Critical Strike Chance +%","40"],
"Ezomyte Dagger":["Dagger","62","18-72","1.4","63","0","95","131","Critical Strike Chance +%","40"],
"Platinum Kris":["Dagger","64","20-81","1.2","60.6","0","76","149","Critical Strike Chance +%","80"],
"Imperial Skean":["Dagger","66","17-69","1.45","62.4","0","95","131","Critical Strike Chance +%","40"],
"Demon Dagger":["Dagger","68","21-85","1.2","63.6","0","76","149","Critical Strike Chance +%","60"],
"Sai":["Dagger","70","20-80","1.3","65","0","121","121","Monster Base Block %","6"],
"Rusted Hatchet":["One Hand Axe","2","5-9","1.5","10.5","12","6","0","",""],
"Jade Hatchet":["One Hand Axe","6","8-13","1.4","14.7","21","10","0","",""],
"Boarding Axe":["One Hand Axe","11","9-17","1.5","19.5","28","19","0","",""],
"Cleaver":["One Hand Axe","16","11-33","1.2","26.4","48","14","0","",""],
"Broad Axe":["One Hand Axe","21","17-31","1.3","31.2","54","25","0","",""],
"Arming Axe":["One Hand Axe","25","12-36","1.4","33.6","58","33","0","",""],
"Decorative Axe":["One Hand Axe","29","23-43","1.2","39.6","80","23","0","",""],
"Spectral Axe":["One Hand Axe","33","26-43","1.3","44.9","85","37","0","",""],
"Etched Hatchet":["One Hand Axe","35","24-42","1.35","44.6","93","43","0","Physical Damage +%","8"],
"Jasper Axe":["One Hand Axe","36","28-43","1.3","46.2","86","40","0","",""],
"Tomahawk":["One Hand Axe","39","22-41","1.5","47.3","81","56","0","",""],
"Wrist Chopper":["One Hand Axe","42","23-68","1.2","54.6","112","32","0","",""],
"War Axe":["One Hand Axe","45","30-55","1.3","55.3","106","49","0","",""],
"Chest Splitter":["One Hand Axe","48","20-61","1.4","56.7","105","60","0","",""],
"Ceremonial Axe":["One Hand Axe","51","37-69","1.2","63.6","134","39","0","",""],
"Wraith Axe":["One Hand Axe","54","39-65","1.3","67.6","134","59","0","",""],
"Engraved Hatchet":["One Hand Axe","56","35-63","1.35","66.2","143","66","0","Physical Damage +%","8"],
"Karui Axe":["One Hand Axe","57","41-64","1.3","68.3","132","62","0","",""],
"Siege Axe":["One Hand Axe","59","32-59","1.5","68.3","119","82","0","",""],
"Reaver Axe":["One Hand Axe","61","31-92","1.2","73.8","167","57","0","",""],
"Butcher Axe":["One Hand Axe","63","38-71","1.3","70.9","149","76","0","",""],
"Vaal Hatchet":["One Hand Axe","65","25-74","1.4","69.3","140","86","0","",""],
"Royal Axe":["One Hand Axe","67","43-80","1.2","73.8","167","57","0","",""],
"Infernal Axe":["One Hand Axe","69","43-72","1.3","74.8","158","76","0","",""],
"Runic Hatchet":["One Hand Axe","71","38-68","1.35","71.6","163","82","0","Physical Damage +%","12"],
"Driftwood Club":["One Hand Mace","1","5-7","1.45","8.7","14","0","0","Base Stun Duration +%","20"],
"Tribal Club":["One Hand Mace","5","7-12","1.35","12.8","26","0","0","Base Stun Duration +%","20"],
"Spiked Club":["One Hand Mace","10","11-14","1.4","17.5","41","0","0","Base Stun Duration +%","20"],
"Stone Hammer":["One Hand Mace","15","14-27","1.15","23.6","56","0","0","Base Stun Duration +%","40"],
"War Hammer":["One Hand Mace","20","11-26","1.4","25.9","71","0","0","Base Stun Duration +%","20"],
"Bladed Mace":["One Hand Mace","24","18-30","1.3","31.2","83","0","0","Base Stun Duration +%","20"],
"Ceremonial Mace":["One Hand Mace","28","26-33","1.2","35.4","95","0","0","Base Stun Duration +%","40"],
"Dream Mace":["One Hand Mace","32","17-35","1.4","36.4","107","0","0","Base Stun Duration +%","20"],
"Wyrm Mace":["One Hand Mace","34","23-35","1.35","39.2","118","0","0","Attack Speed +%","4"],
"Petrified Club":["One Hand Mace","35","25-41","1.25","41.3","116","0","0","Base Stun Duration +%","20"],
"Barbed Club":["One Hand Mace","38","27-34","1.4","42.7","125","0","0","Base Stun Duration +%","20"],
"Rock Breaker":["One Hand Mace","41","30-55","1.15","48.9","134","0","0","Base Stun Duration +%","40"],
"Battle Hammer":["One Hand Mace","44","20-48","1.4","47.6","143","0","0","Base Stun Duration +%","20"],
"Flanged Mace":["One Hand Mace","47","30-50","1.3","52","152","0","0","Base Stun Duration +%","20"],
"Ornate Mace":["One Hand Mace","50","42-53","1.2","57","161","0","0","Base Stun Duration +%","40"],
"Phantom Mace":["One Hand Mace","53","26-54","1.4","56","170","0","0","Base Stun Duration +%","20"],
"Dragon Mace":["One Hand Mace","55","35-53","1.35","59.4","184","0","0","Attack Speed +%","4"],
"Ancestral Club":["One Hand Mace","56","37-62","1.25","61.9","179","0","0","Base Stun Duration +%","20"],
"Tenderizer":["One Hand Mace","58","38-49","1.4","60.9","185","0","0","Base Stun Duration +%","20"],
"Gavel":["One Hand Mace","60","42-77","1.15","68.4","212","0","0","Base Stun Duration +%","40"],
"Legion Hammer":["One Hand Mace","62","27-63","1.4","63","212","0","0","Base Stun Duration +%","20"],
"Pernarch":["One Hand Mace","64","37-62","1.3","64.4","212","0","0","Base Stun Duration +%","20"],
"Auric Mace":["One Hand Mace","66","49-63","1.2","67.2","212","0","0","Base Stun Duration +%","40"],
"Nightmare Mace":["One Hand Mace","68","29-61","1.4","63","212","0","0","Base Stun Duration +%","20"],
"Behemoth Mace":["One Hand Mace","70","38-57","1.35","64.1","220","0","0","Attack Speed +%","6"],
"Rusted Sword":["One Hand Sword","1","4-8","1.45","8.7","8","8","0","Local Accuracy Rating +%","18"],
"Copper Sword":["One Hand Sword","5","6-12","1.4","12.6","14","14","0","Local Accuracy Rating +%","18"],
"Sabre":["One Hand Sword","10","4-18","1.55","17.1","18","26","0","Local Accuracy Rating +%","18"],
"Broad Sword":["One Hand Sword","15","14-21","1.3","22.8","30","30","0","Local Accuracy Rating +%","18"],
"War Sword":["One Hand Sword","20","16-30","1.2","27.6","41","35","0","Local Accuracy Rating +%","18"],
"Ancient Sword":["One Hand Sword","24","17-31","1.3","31.2","44","44","0","Local Accuracy Rating +%","18"],
"Elegant Sword":["One Hand Sword","28","17-27","1.5","33","46","55","0","Local Accuracy Rating +%","18"],
"Dusk Blade":["One Hand Sword","32","15-43","1.3","37.7","57","57","0","Local Accuracy Rating +%","18"],
"Hook Sword":["One Hand Sword","34","23-49","1.15","41.4","64","64","0","Base Chance To Dodge %","2"],
"Variscite Blade":["One Hand Sword","35","20-43","1.3","41","62","62","0","Local Accuracy Rating +%","18"],
"Cutlass":["One Hand Sword","38","11-44","1.55","42.6","55","79","0","Local Accuracy Rating +%","18"],
"Baselard":["One Hand Sword","41","29-42","1.3","46.2","72","72","0","Local Accuracy Rating +%","18"],
"Battle Sword":["One Hand Sword","44","30-55","1.2","51","83","70","0","Local Accuracy Rating +%","18"],
"Elder Sword":["One Hand Sword","47","28-52","1.3","52","81","81","0","Local Accuracy Rating +%","18"],
"Graceful Sword":["One Hand Sword","50","27-44","1.5","53.3","78","94","0","Local Accuracy Rating +%","18"],
"Twilight Blade":["One Hand Sword","53","23-66","1.3","57.9","91","91","0","Local Accuracy Rating +%","18"],
"Grappler":["One Hand Sword","55","35-75","1.15","63.3","99","99","0","Base Chance To Dodge %","2"],
"Gemstone Sword":["One Hand Sword","56","30-64","1.3","61.1","96","96","0","Local Accuracy Rating +%","18"],
"Corsair Sword":["One Hand Sword","58","16-63","1.55","61.2","81","117","0","Local Accuracy Rating +%","18"],
"Gladius":["One Hand Sword","60","41-59","1.3","65","113","113","0","Local Accuracy Rating +%","18"],
"Legion Sword":["One Hand Sword","62","39-73","1.2","67.2","122","104","0","Local Accuracy Rating +%","18"],
"Vaal Blade":["One Hand Sword","64","35-65","1.3","65","113","113","0","Local Accuracy Rating +%","18"],
"Eternal Sword":["One Hand Sword","66","32-52","1.5","63","104","122","0","Local Accuracy Rating +%","18"],
"Midnight Blade":["One Hand Sword","68","26-74","1.3","65","113","113","0","Local Accuracy Rating +%","18"],
"Tiger Hook":["One Hand Sword","70","43-92","1.15","77.6","119","119","0","Base Chance To Dodge %","3"],
"Driftwood Sceptre":["Sceptre","1","5-7","1.4","8.4","8","0","8","Elemental Damage +%","10"],
"Darkwood Sceptre":["Sceptre","5","7-10","1.5","12.8","14","0","14","Elemental Damage +%","10"],
"Bronze Sceptre":["Sceptre","10","10-19","1.25","18.1","22","0","22","Elemental Damage +%","10"],
"Quartz Sceptre":["Sceptre","15","14-21","1.25","21.9","25","0","35","Elemental Damage +%","20"],
"Iron Sceptre":["Sceptre","20","18-27","1.25","28.1","38","0","38","Elemental Damage +%","10"],
"Ochre Sceptre":["Sceptre","24","15-28","1.4","30.1","44","0","44","Elemental Damage +%","10"],
"Ritual Sceptre":["Sceptre","28","18-41","1.2","35.4","51","0","51","Elemental Damage +%","10"],
"Shadow Sceptre":["Sceptre","32","25-37","1.25","38.8","52","0","62","Elemental Damage +%","15"],
"Grinning Fetish":["Sceptre","35","21-32","1.5","39.8","62","0","62","Elemental Damage +%","10"],
"Horned Sceptre":["Sceptre","36","22-42","1.3","41.6","66","0","66","Reduce Enemy Elemental Resistance %","1"],
"Sekhem":["Sceptre","38","25-46","1.25","44.4","67","0","67","Elemental Damage +%","10"],
"Crystal Sceptre":["Sceptre","41","29-43","1.25","45","59","0","85","Elemental Damage +%","20"],
"Lead Sceptre":["Sceptre","44","32-48","1.25","50","77","0","77","Elemental Damage +%","10"],
"Blood Sceptre":["Sceptre","47","25-47","1.4","50.4","81","0","81","Elemental Damage +%","10"],
"Royal Sceptre":["Sceptre","50","29-67","1.2","57.6","86","0","86","Elemental Damage +%","10"],
"Abyssal Sceptre":["Sceptre","53","38-57","1.25","59.4","83","0","99","Elemental Damage +%","15"],
"Stag Sceptre":["Sceptre","55","32-60","1.3","59.8","98","0","98","Reduce Enemy Elemental Resistance %","1"],
"Karui Sceptre":["Sceptre","56","32-47","1.5","59.3","96","0","96","Elemental Damage +%","10"],
"Tyrant's Sekhem":["Sceptre","58","36-67","1.25","64.4","99","0","99","Elemental Damage +%","10"],
"Opal Sceptre":["Sceptre","60","40-60","1.25","62.5","95","0","131","Elemental Damage +%","20"],
"Platinum Sceptre":["Sceptre","62","42-63","1.25","65.6","113","0","113","Elemental Damage +%","10"],
"Vaal Sceptre":["Sceptre","64","31-58","1.4","62.3","113","0","113","Elemental Damage +%","10"],
"Carnal Sceptre":["Sceptre","66","34-78","1.2","67.2","113","0","113","Elemental Damage +%","10"],
"Void Sceptre":["Sceptre","68","42-63","1.25","65.6","104","0","122","Elemental Damage +%","15"],
"Sambar Sceptre":["Sceptre","70","35-65","1.3","65","121","0","113","Reduce Enemy Elemental Resistance %","2"],
"Gnarled Branch":["Staff","4","8-17","1.3","16.3","12","0","12","Staff Block %","12"],
"Primitive Staff":["Staff","9","9-28","1.25","23.1","20","0","20","Staff Block %","12"],
"Long Staff":["Staff","13","17-28","1.3","29.3","27","0","27","Staff Block %","12"],
"Iron Staff":["Staff","18","16-47","1.2","37.8","35","0","35","Staff Block %","12"],
"Coiled Staff":["Staff","23","23-48","1.2","42.6","43","0","43","Staff Block %","18"],
"Royal Staff":["Staff","28","23-70","1.15","53.5","51","0","51","Staff Block %","12"],
"Vile Staff":["Staff","33","33-62","1.25","59.4","59","0","59","Staff Block %","12"],
"Crescent Staff":["Staff","36","35-73","1.2","64.8","66","0","66","Critical Strike Chance +%","60"],
"Woodful Staff":["Staff","37","29-88","1.15","67.3","65","0","65","Staff Block %","12"],
"Quarterstaff":["Staff","41","41-68","1.3","70.9","72","0","72","Staff Block %","12"],
"Military Staff":["Staff","45","34-101","1.2","81","78","0","78","Staff Block %","12"],
"Serpentine Staff":["Staff","49","46-95","1.2","84.6","85","0","85","Staff Block %","18"],
"Highborn Staff":["Staff","52","42-125","1.15","96","89","0","89","Staff Block %","12"],
"Foul Staff":["Staff","55","55-103","1.25","98.8","94","0","94","Staff Block %","12"],
"Moon Staff":["Staff","57","57-118","1.2","105","101","0","101","Critical Strike Chance +%","60"],
"Primordial Staff":["Staff","58","47-141","1.15","108.1","99","0","99","Staff Block %","12"],
"Lathi":["Staff","60","62-103","1.3","107.3","113","0","113","Staff Block %","12"],
"Ezomyte Staff":["Staff","62","46-138","1.2","110.4","113","0","113","Staff Block %","12"],
"Maelström Staff":["Staff","64","57-119","1.2","105.6","113","0","113","Staff Block %","18"],
"Imperial Staff":["Staff","66","49-147","1.15","112.7","113","0","113","Staff Block %","12"],
"Judgement Staff":["Staff","68","61-113","1.25","108.8","113","0","113","Staff Block %","12"],
"Eclipse Staff":["Staff","70","60-125","1.2","111","117","0","117","Critical Strike Chance +%","80"],
"Rusted Spike":["Thrusting One Hand Sword","3","4-10","1.4","9.8","0","20","0","Base Critical Strike Multiplier +%","20"],
"Whalebone Rapier":["Thrusting One Hand Sword","7","4-15","1.55","14.7","0","32","0","Base Critical Strike Multiplier +%","20"],
"Battered Foil":["Thrusting One Hand Sword","12","10-18","1.4","19.6","0","47","0","Base Critical Strike Multiplier +%","20"],
"Basket Rapier":["Thrusting One Hand Sword","17","9-22","1.5","23.3","0","62","0","Base Critical Strike Multiplier +%","20"],
"Jagged Foil":["Thrusting One Hand Sword","22","11-25","1.6","28.8","0","77","0","Base Critical Strike Multiplier +%","20"],
"Antique Rapier":["Thrusting One Hand Sword","26","10-40","1.3","32.5","0","89","0","Base Critical Strike Multiplier +%","20"],
"Elegant Foil":["Thrusting One Hand Sword","30","15-28","1.6","34.4","0","101","0","Base Critical Strike Multiplier +%","20"],
"Thorn Rapier":["Thrusting One Hand Sword","34","16-37","1.4","37.1","0","113","0","Base Critical Strike Multiplier +%","35"],
"Smallsword":["Thrusting One Hand Sword","36","17-36","1.55","41.1","0","124","0","Local Chance To Bleed On Hit %","8"],
"Wyrmbone Rapier":["Thrusting One Hand Sword","37","11-44","1.5","41.3","0","122","0","Base Critical Strike Multiplier +%","20"],
"Burnished Foil":["Thrusting One Hand Sword","40","22-41","1.4","44.1","0","131","0","Base Critical Strike Multiplier +%","20"],
"Estoc":["Thrusting One Hand Sword","43","19-44","1.5","47.3","0","140","0","Base Critical Strike Multiplier +%","20"],
"Serrated Foil":["Thrusting One Hand Sword","46","19-43","1.6","49.6","0","149","0","Base Critical Strike Multiplier +%","20"],
"Primeval Rapier":["Thrusting One Hand Sword","49","17-67","1.3","54.6","0","158","0","Base Critical Strike Multiplier +%","20"],
"Fancy Foil":["Thrusting One Hand Sword","52","24-45","1.6","55.2","0","167","0","Base Critical Strike Multiplier +%","20"],
"Apex Rapier":["Thrusting One Hand Sword","55","24-55","1.4","55.3","0","176","0","Base Critical Strike Multiplier +%","35"],
"Courtesan Sword":["Thrusting One Hand Sword","57","26-53","1.55","61.2","0","190","0","Local Chance To Bleed On Hit %","8"],
"Dragonbone Rapier":["Thrusting One Hand Sword","58","16-65","1.5","60.8","0","185","0","Base Critical Strike Multiplier +%","20"],
"Tempered Foil":["Thrusting One Hand Sword","60","31-58","1.4","62.3","0","212","0","Base Critical Strike Multiplier +%","20"],
"Pecoraro":["Thrusting One Hand Sword","62","25-59","1.5","63","0","212","0","Base Critical Strike Multiplier +%","20"],
"Spiraled Foil":["Thrusting One Hand Sword","64","24-55","1.6","63.2","0","212","0","Base Critical Strike Multiplier +%","20"],
"Vaal Rapier":["Thrusting One Hand Sword","66","20-80","1.3","65","0","212","0","Base Critical Strike Multiplier +%","20"],
"Jewelled Foil":["Thrusting One Hand Sword","68","27-51","1.6","62.4","0","212","0","Base Critical Strike Multiplier +%","20"],
"Harpy Rapier":["Thrusting One Hand Sword","70","26-60","1.4","60.2","0","212","0","Base Critical Strike Multiplier +%","35"],
"Dragoon Sword":["Thrusting One Hand Sword","72","28-58","1.5","64.5","0","220","0","Local Chance To Bleed On Hit %","12"],
"Stone Axe":["Two Hand Axe","4","10-17","1.3","17.6","17","8","0","",""],
"Jade Chopper":["Two Hand Axe","9","17-27","1.2","26.4","31","9","0","",""],
"Woodsplitter":["Two Hand Axe","13","17-35","1.25","32.5","36","17","0","",""],
"Poleaxe":["Two Hand Axe","18","25-37","1.3","40.3","44","25","0","",""],
"Double Axe":["Two Hand Axe","23","32-54","1.2","51.6","62","27","0","",""],
"Gilded Axe":["Two Hand Axe","28","37-50","1.3","56.6","64","37","0","",""],
"Shadow Axe":["Two Hand Axe","33","42-62","1.25","65","80","37","0","",""],
"Dagger Axe":["Two Hand Axe","36","45-71","1.2","69.6","89","43","0","Local Critical Strike Chance +%","25"],
"Jasper Chopper":["Two Hand Axe","37","50-78","1.15","73.6","100","29","0","",""],
"Timber Axe":["Two Hand Axe","41","41-85","1.25","78.8","97","45","0","",""],
"Headsman Axe":["Two Hand Axe","45","53-79","1.3","85.8","99","57","0","",""],
"Labrys":["Two Hand Axe","49","63-105","1.2","100.8","122","53","0","",""],
"Noble Axe":["Two Hand Axe","52","65-88","1.3","99.5","113","65","0","",""],
"Abyssal Axe":["Two Hand Axe","55","69-104","1.25","108.1","128","60","0","",""],
"Karui Chopper":["Two Hand Axe","58","80-125","1.15","117.9","151","43","0","",""],
"Talon Axe":["Two Hand Axe","59","75-118","1.2","115.8","140","67","0","Local Critical Strike Chance +%","25"],
"Sundering Axe":["Two Hand Axe","60","62-128","1.25","118.8","149","76","0","",""],
"Ezomyte Axe":["Two Hand Axe","62","72-108","1.3","117","140","86","0","",""],
"Vaal Axe":["Two Hand Axe","64","79-131","1.2","126","158","76","0","",""],
"Despot Axe":["Two Hand Axe","66","76-103","1.3","116.4","140","86","0","",""],
"Void Axe":["Two Hand Axe","68","76-114","1.25","118.8","149","76","0","",""],
"Fleshripper":["Two Hand Axe","70","80-125","1.2","123","156","84","0","Local Critical Strike Chance +%","40"],
"Driftwood Maul":["Two Hand Mace","3","9-13","1.3","14.3","20","0","0","Base Stun Duration +%","20"],
"Tribal Maul":["Two Hand Mace","8","15-23","1.2","22.8","35","0","0","Base Stun Duration +%","20"],
"Mallet":["Two Hand Mace","12","15-30","1.25","28.1","47","0","0","Base Stun Duration +%","20"],
"Sledgehammer":["Two Hand Mace","17","21-32","1.3","34.5","62","0","0","Base Stun Duration +%","40"],
"Jagged Maul":["Two Hand Mace","22","24-45","1.25","43.1","77","0","0","Base Stun Duration +%","20"],
"Brass Maul":["Two Hand Mace","27","34-51","1.2","51","92","0","0","Base Stun Duration +%","20"],
"Fright Maul":["Two Hand Mace","32","39-53","1.25","57.5","107","0","0","Base Stun Duration +%","20"],
"Morning Star":["Two Hand Mace","34","39-58","1.25","60.6","118","0","0","Base Skill Area Of Effect +%","4"],
"Totemic Maul":["Two Hand Mace","36","49-73","1.1","67.1","119","0","0","Base Stun Duration +%","20"],
"Great Mallet":["Two Hand Mace","40","37-76","1.25","70.6","131","0","0","Base Stun Duration +%","20"],
"Steelhead":["Two Hand Mace","44","47-70","1.3","76.1","143","0","0","Base Stun Duration +%","40"],
"Spiny Maul":["Two Hand Mace","48","47-88","1.25","84.4","155","0","0","Base Stun Duration +%","20"],
"Plated Maul":["Two Hand Mace","51","62-92","1.2","92.4","164","0","0","Base Stun Duration +%","20"],
"Dread Maul":["Two Hand Mace","54","66-89","1.25","96.9","173","0","0","Base Stun Duration +%","20"],
"Solar Maul":["Two Hand Mace","56","64-97","1.25","100.6","187","0","0","Base Skill Area Of Effect +%","4"],
"Karui Maul":["Two Hand Mace","57","79-118","1.1","108.4","182","0","0","Base Stun Duration +%","20"],
"Colossus Mallet":["Two Hand Mace","59","57-118","1.25","109.4","188","0","0","Base Stun Duration +%","20"],
"Piledriver":["Two Hand Mace","61","67-100","1.3","108.6","212","0","0","Base Stun Duration +%","40"],
"Meatgrinder":["Two Hand Mace","63","63-117","1.25","112.5","212","0","0","Base Stun Duration +%","20"],
"Imperial Maul":["Two Hand Mace","65","74-111","1.2","111","212","0","0","Base Stun Duration +%","20"],
"Terror Maul":["Two Hand Mace","67","75-102","1.25","110.6","212","0","0","Base Stun Duration +%","20"],
"Coronal Maul":["Two Hand Mace","69","74-110","1.25","115","220","0","0","Base Skill Area Of Effect +%","6"],
"Corroded Blade":["Two Hand Sword","3","7-14","1.35","14.2","11","11","0","Local Accuracy Rating +%","18"],
"Longsword":["Two Hand Sword","8","11-25","1.25","22.5","20","17","0","Local Accuracy Rating +%","18"],
"Bastard Sword":["Two Hand Sword","12","15-25","1.35","27","21","30","0","Local Accuracy Rating +%","18"],
"Two-Handed Sword":["Two Hand Sword","17","20-37","1.25","35.6","33","33","0","Local Accuracy Rating +%","18"],
"Etched Greatsword":["Two Hand Sword","22","24-49","1.2","43.8","45","38","0","Local Accuracy Rating +%","18"],
"Ornate Sword":["Two Hand Sword","27","29-48","1.3","50.1","45","54","0","Local Accuracy Rating +%","18"],
"Spectral Sword":["Two Hand Sword","32","30-62","1.25","57.5","57","57","0","Local Accuracy Rating +%","30"],
"Curved Blade":["Two Hand Sword","35","39-65","1.25","65","62","73","0","Base Critical Strike Multiplier +%","25"],
"Butcher Sword":["Two Hand Sword","36","32-75","1.2","64.2","69","58","0","Local Accuracy Rating +%","18"],
"Footman Sword":["Two Hand Sword","40","38-63","1.35","68.2","57","83","0","Local Accuracy Rating +%","18"],
"Highland Blade":["Two Hand Sword","44","43-80","1.25","76.9","77","77","0","Local Accuracy Rating +%","18"],
"Engraved Greatsword":["Two Hand Sword","48","47-97","1.2","86.4","91","76","0","Local Accuracy Rating +%","18"],
"Tiger Sword":["Two Hand Sword","51","52-86","1.3","89.7","80","96","0","Local Accuracy Rating +%","18"],
"Wraith Sword":["Two Hand Sword","54","50-104","1.25","96.3","93","93","0","Local Accuracy Rating +%","30"],
"Lithe Blade":["Two Hand Sword","56","63-105","1.25","105","96","113","0","Base Critical Strike Multiplier +%","25"],
"Headman's Sword":["Two Hand Sword","57","52-122","1.2","104.4","106","89","0","Local Accuracy Rating +%","18"],
"Reaver Sword":["Two Hand Sword","59","57-95","1.35","102.6","82","119","0","Local Accuracy Rating +%","18"],
"Ezomyte Blade":["Two Hand Sword","61","61-113","1.25","108.8","113","113","0","Local Accuracy Rating +%","18"],
"Vaal Greatsword":["Two Hand Sword","63","60-125","1.2","111","122","104","0","Local Accuracy Rating +%","18"],
"Lion Sword":["Two Hand Sword","65","62-103","1.3","107.3","104","122","0","Local Accuracy Rating +%","18"],
"Infernal Sword":["Two Hand Sword","67","57-118","1.25","109.4","113","113","0","Local Accuracy Rating +%","30"],
"Exquisite Blade":["Two Hand Sword","70","68-114","1.25","113.8","119","131","0","Base Critical Strike Multiplier +%","40"],
"Driftwood Wand":["Wand","1","3-6","1.4","6.3","0","0","14","Spell Damage +%","8-12"],
"Goat's Horn":["Wand","6","5-10","1.2","9","0","0","29","Spell Damage +%","9-12"],
"Carved Wand":["Wand","12","6-11","1.5","12.8","0","0","47","Spell Damage +%","9-13"],
"Quartz Wand":["Wand","18","9-17","1.3","16.9","0","0","65","Spell Damage +%","11-15"],
"Spiraled Wand":["Wand","24","8-24","1.3","20.8","0","0","83","Spell Damage +%","10-14"],
"Sage Wand":["Wand","30","15-28","1.2","25.8","0","0","119","Spell Damage +%","11-14"],
"Pagan Wand":["Wand","34","14-26","1.35","27","0","0","118","Cast Speed +%","4"],
"Faun's Horn":["Wand","35","17-32","1.2","29.4","0","0","116","Spell Damage +%","12-15"],
"Engraved Wand":["Wand","40","14-27","1.5","30.8","0","0","131","Spell Damage +%","12-16"],
"Crystal Wand":["Wand","45","19-35","1.3","35.1","0","0","146","Spell Damage +%","14-18"],
"Serpent Wand":["Wand","49","15-44","1.3","38.4","0","0","158","Spell Damage +%","13-17"],
"Omen Wand":["Wand","53","25-46","1.2","42.6","0","0","200","Spell Damage +%","14-17"],
"Heathen Wand":["Wand","55","21-40","1.35","41.2","0","0","184","Cast Speed +%","4"],
"Demon's Horn":["Wand","56","26-48","1.2","44.4","0","0","179","Spell Damage +%","15-18"],
"Imbued Wand":["Wand","59","20-38","1.5","43.5","0","0","188","Spell Damage +%","15-19"],
"Opal Wand":["Wand","62","24-45","1.3","44.9","0","0","212","Spell Damage +%","17-20"],
"Tornado Wand":["Wand","65","17-52","1.3","44.9","0","0","212","Spell Damage +%","16-19"],
"Prophecy Wand":["Wand","68","27-51","1.2","46.8","0","0","245","Spell Damage +%","16-20"],
"Profane Wand":["Wand","70","23-43","1.35","44.6","0","0","237","Cast Speed +%","6"]};

});
