// based on https://github.com/jgraph/drawio/issues/470

const axios = require("axios");
const fs = require('fs');
const pako = require('pako');

function mxLibraryXML(entries) {
    return ["<mxlibrary>", JSON.stringify(entries), "</mxlibrary>"].join("");
}

function mxLibraryEntryXML(contents) {
    return Buffer.from(pako.deflateRaw(encodeURIComponent(contents))).toString("base64")
}

// possible options: w (width), h (height), aspect (fixed/variable), title (stencil title)
function mxLibraryEntry(title, imageProperties, options) {
    return Object.assign({
        xml: mxLibraryEntryXML(imageProperties.xml),
        title: title,
        aspect: 'fixed',
        w: imageProperties.w,
        h: imageProperties.h
    }, options);
}

function getDimensionFromSvg(svg) {
    const result = svg.match(/viewBox="([-\d.]+)\s([-\d.]+)\s([-\d.]+)\s([-\d.]+)"/);
    let svgWidth = parseInt(result[3])
    let svgHeight = parseInt(result[4])
    return {svgWidth, svgHeight};
}

function mxGraphModelXML(svg) {
    let {svgWidth, svgHeight} = getDimensionFromSvg(svg);

    // limit width to 500
    if (svgWidth > 500) {
        svgHeight = Math.round(svgHeight * (500 / svgWidth))
        svgWidth = 500
    }

    // limit height to 500
    if (svgHeight > 500) {
        svgWidth = Math.round(svgWidth * (500 / svgHeight))
        svgHeight = 500
    }

    return {
        "w": svgWidth,
        "h": svgHeight,
        "xml": [
            // Avoid xml dependencies here, since they are always heavy.
            `<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0"/>`,
            `<mxCell id="2" value="" style="shape=image;verticalLabelPosition=bottom;labelBackgroundColor=default;verticalAlign=top;aspect=fixed;imageAspect=0;image=data:image/svg+xml,`,
            Buffer.from(svg).toString('base64'),
            `;" vertex="1" parent="1">`,
            `<mxGeometry width="${svgWidth}" height="${svgHeight}" as="geometry"/></mxCell></root></mxGraphModel>`
        ].join("")
    };
}

if (!fs.existsSync('generated')) {
    fs.mkdirSync('generated')
}

(async () => {
    const res = await axios.get('https://landscape.cncf.io/api/ids?format=card')

    for (let category of res.data.items) {
        const logos = [];

        for (let items of category.items.filter(item => !item.id.endsWith("-2"))) {
            const svgImage = (await axios.get(`https://landscape.cncf.io/logos/${items.id}.svg`)).data

            logos.push(mxLibraryEntry(items.id, mxGraphModelXML(svgImage)))
        }

        console.log(`${category.header}: ${logos.length} logos`)
        fs.writeFileSync(`generated/${category.header.replace('/', '-')}.xml`, mxLibraryXML(logos))
    }
})();
