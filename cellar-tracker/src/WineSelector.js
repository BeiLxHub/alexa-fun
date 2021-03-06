/*
 * MIT License

 * Copyright (c) 2016 Garrett Vargas

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

const oldWineCutoff = 5;        // How old you have to be considered to be "old"
const nearConsumeCutoff = 2;    // How far out can you be to be considered near consume date

/*
 * The wineCharacteristics object has the following fields:
 *
 * vintage: old or new
 * type: red or white
 * scoreRange: minimum CT score
 * varietal: cabernet, syrah, chardonnay, merlot, zinfandel, pinot noir, malbec, red blend, white blend
 * consumeDate: over, now, or near
 * special: big red or light white
 * random: true
 */

module.exports = {
    // Reads in the user's wine list and stores relevant details into a JSON list
    PickWine : function (wineList, wineCharacteristics)
    {
        // OK, start by filtering the wine list based on the desired characteristics
        var newList = FilterWineList(wineList, wineCharacteristics);

        if (!newList.length)
        {
            // No wines meet the criteria
            return ("Sorry, you don't have any wines that are " + ReadCharacteristics(wineCharacteristics));
        }
        else
        {
            // Pick randomly from the filtered list
            var wine = newList[Math.floor(Math.random() * newList.length)];

            return DescribeWineChoice(wine, wineCharacteristics);
        }
    }
};

/*
 * Internal functions
 */
function ReadCharacteristics(wineCharacteristics)
{
    var speech = "";

    // Start with vintage, type, varietal, and special
    if (wineCharacteristics.hasOwnProperty("vintage"))
    {
        speech += wineCharacteristics.vintage + " ";
    }
    if (wineCharacteristics.hasOwnProperty("type"))
    {
        speech += wineCharacteristics.type + " ";
    }
    if (wineCharacteristics.hasOwnProperty("varietal"))
    {
        speech += wineCharacteristics.varietal + " ";
    }
    if (wineCharacteristics.hasOwnProperty("special"))
    {
        speech += wineCharacteristics.special + " ";
    }

    // Now for scoreRange and consumeDate
    if (wineCharacteristics.hasOwnProperty("scoreRange"))
    {
        speech += (wineCharacteristics.scoreRange[0] + " to " + wineCharacteristics.scoreRange[1] + " point ");
    }
    if (wineCharacteristics.hasOwnProperty("consumeDate"))
    {
        speech += (speech == "") ? "" : " and ";
        if (wineCharacteristics.consumeDate == "over")
        {
            speech += "past expiration";
        }
        else if (wineCharacteristics.consumeDate == "now")
        {
            speech += "ready to drink";
        }
    }

    return speech;
}

const myIntFields = ["Quantity","Vintage","BeginConsume","EndConsume"];
const myStringFields = ["Location","Size","Wine","Producer","Type","Varietal","MasterVarietal"];
const myFloatFields = ["CT"];

function FilterWineList(wineList, wineCharacteristics)
{
    var newWineList = [];
    var currentYear = new Date().getFullYear();

console.log(JSON.stringify(wineCharacteristics));

    wineList.wines.forEach(wine => {
        let passes = true;  // You pass the filter by default

        // Location filter - only consider wines in the house unless a location is provided
        if (!wineCharacteristics.location) {
            if (!wine.Location || (wine.Location.toLowerCase().indexOf("cellar") == -1)) {
                passes = false;
            }
        }
        else if (!wine.Location || (wine.Location.toLowerCase().indexOf(wineCharacteristics.location) == -1)) {
            passes = false;
        }

        // Vintage filter
        if (wineCharacteristics.vintage == "old") {
            if (!wine.Vintage || (wine.Vintage >= (currentYear - oldWineCutoff))) {
                passes = false;
            }
        } else if (wineCharacteristics.vintage == "new") {
            if (!wine.Vintage || (wine.Vintage < (currentYear - oldWineCutoff))) {
                passes = false;
            }
        }

        // Type filter
        if (wineCharacteristics.type) {
            if (!wine.Type || (wine.Type.toLowerCase().indexOf(wineCharacteristics.type) == -1)) {
                passes = false;
            }
        }

        // minQuantity filter
        if (wineCharacteristics.minQuantity) {
            if (!wine.Quantity || (wine.Quantity < wineCharacteristics.minQuantity)) {
                passes = false;
            }
        }

        // scoreRange filter
        if (wineCharacteristics.scoreRange) {
            if (!wine.CT || (wine.CT < wineCharacteristics.scoreRange[0]) || (wine.CT > wineCharacteristics.scoreRange[1])) {
                passes = false;
            }
        }

        // varietal filter
        if (wineCharacteristics.varietal) {
            if (!wine.MasterVarietal) {
                passes = false;
            } else if (wine.MasterVarietal.toLowerCase().indexOf(wineCharacteristics.varietal) == -1) {
                // Not an exact substring, but there are exceptions that pass the filter
                passes = false;
                if ((wine.MasterVarietal == "red blend") && (wine.MasterVarietal.toLowerCase().indexOf("bordeaux blend") > -1)) {
                    passes = true;
                }
            }
        }

        // consumeDate filter
        if (wineCharacteristics.consumeDate) {
            if (wineCharacteristics.consumeDate == "over") {
                if (!wine.EndConsume || (wine.EndConsume >= currentYear)) {
                    passes = false;
                }
            } else if (wineCharacteristics.consumeDate == "now") {
                if (!wine.EndConsume || (wine.EndConsume < currentYear)) {
                    passes = false;
                }
            } else if (wineCharacteristics.consumeDate == "near") {
                if (!wine.EndConsume || (wine.EndConsume < currentYear) || (wine.EndConsume > (currentYear + nearConsumeCutoff))) {
                    passes = false;
                }
            }
        }

        // special filter
        if (wineCharacteristics.special) {
            if (wineCharacteristics.special == "big red") {
                // This matches Cabernet, Bordeaux, Syrah, Tuscan, and Zinfandel
                var BigRed = ["cabernet", "bordeaux", "syrah", "tuscan", "zinfandel"];

                passes = false;
                if (wine.MasterVarietal) {
                    BigRed.forEach(red => {if (wine.MasterVarietal.toLowerCase().indexOf(red) > -1) passes = true;});
                }
            }
            else if (wineCharacteristics.special == "light white") {
                // This matches White Blend, Viognier, Riesling
                var LightWhite = ["white blend", "viognier", "riesling"];

                passes = false;
                if (wine.MasterVarietal) {
                    LightWhite.forEach(white => {if (wine.MasterVarietal.toLowerCase().indexOf(white) > -1) passes = true;});
                }
            }
        }

        // If we passed, add it to our new list
        if (passes)
        {
            newWineList.push(wine);
        }
    });

    // That's what matches!
    return newWineList;
}

/*
 * converts a wine to text - considering the desired characteristics to provide more context
 */
function WineToText(wine, wineCharacteristics)
{
    var speech = (wine.Vintage) ? (wine.Vintage + " " + wine.Wine) : wine.Wine;

    if (wineCharacteristics.scoreRange)
    {
        // Round the score to one decimal point
        speech += " with a score of " + wine.CT.toFixed(1);
    }
    if (wineCharacteristics.consumeDate)
    {
        // Read the consumption dates
        if (wine.BeginConsume)
        {
            speech += " drink between " + wine.BeginConsume + " and " + wine.EndConsume;
        }
        else
        {
            speech += " drink by " + wine.EndConsume;
        }
    }
    if (wineCharacteristics.special)
    {
        // Read the master varietal
        speech += " a " + wine.MasterVarietal;
    }
    if (wineCharacteristics.location)
    {
        speech += " in " + wine.Location;
    }

    return speech;
}

function DescribeWineChoice(wine, wineCharacteristics)
{
    var speech;
    var winePattern = [
        "I've heard good things about {wine}.",
        "{wine} is a good choice.",
        "You should consider {wine}.",
        "There is a {wine} you should try.",
        "Let's open {wine}."
    ];

    // First get the bottle description
    var wineText = WineToText(wine, wineCharacteristics);

    // Now a random descriptor
    speech = winePattern[Math.floor(Math.random() * winePattern.length)].replace("{wine}", wineText);

    // Finally let them know how many bottles they have
    speech += " You have " + wine.Quantity + ((wine.Quantity == 1) ? " bottle." : " bottles.");
    return speech;
}
