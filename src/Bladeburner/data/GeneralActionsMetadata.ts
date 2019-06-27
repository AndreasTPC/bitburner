/**
 * Metadata for initializing Bladeburner GeneralAction objects
 */
import { IActionConstructorParams } from "../Action";

export const GeneralActionsMetadata: IActionConstructorParams[] = [
    {
        name: "Training",
        desc: "Improve your abilities at the Bladeburner unit's specialized training " +
              "center. Doing this gives experience for all combat stats and also " +
              "increases your max stamina."
    }, {
        name:"Field Analysis",
        desc:"Mine and analyze Synthoid-related data. This improve the " +
             "Bladeburner's unit intelligence on Synthoid locations and " +
             "activities. Completing this action will improve the accuracy " +
             "of your Synthoid population estimated in the current city.<br><br>" +
             "Does NOT require stamina."
    }, {
        name:"Recruitment",
        desc:"Attempt to recruit members for your Bladeburner team. These members " +
             "can help you conduct operations.<br><br>" +
             "Does NOT require stamina."
    }, {
        name: "Diplomacy",
        desc: "Improve diplomatic relations with the Synthoid population. " +
              "Completing this action will reduce the Chaos level in your current city.<br><br>" +
              "Does NOT require stamina."
    }, {
        name: "Hyperbolic Regeneration Chamber",
        desc: "Enter cryogenic stasis using the Bladeburner division's hi-tech Regeneration Chamber. " +
              "This will slowly heal your wounds and slightly increase your stamina.<br><br>",
    }
]
