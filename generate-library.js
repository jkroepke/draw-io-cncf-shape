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
function mxLibraryEntry(title, contents, options) {
    return Object.assign({
        xml: mxLibraryEntryXML(contents),
        title: title
    }, options);
}

function mxGraphModelXML(svg) {
    // -4.47 -3.97 440.44 381.69
    const result = svg.match(/viewBox="([-\d.]+)\s([-\d.]+)\s([-\d.]+)\s([-\d.]+)"/);
    const svgWidth = parseInt(result[3])
    const svgHeight = parseInt(result[4])

    return [
        `<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0"/><mxCell id="2" value="" style="shape=image;verticalLabelPosition=bottom;labelBackgroundColor=default;verticalAlign=top;aspect=fixed;imageAspect=0;image=data:image/svg+xml,`,
        Buffer.from(svg).toString('base64'),
        `;" vertex="1" parent="1"><mxGeometry width="${svgWidth}" height="${svgHeight}" as="geometry"/></mxCell></root></mxGraphModel>`
    ].join("");
}

(async () => {
    if (!fs.existsSync('generated')) {
        fs.mkdirSync('generated')
    }

    const res = await axios.get('https://landscape.cncf.io/api/ids?category=&project=&license=&organization=&headquarters=&company-type=&industries=&sort=name&grouping=project&bestpractices=&enduser=&parent=&language=&format=card')

    for (let category of res.data.items) {
        console.log(category.header)

        const logos = [];

        for (let items of category.items.filter(item => !item.id.endsWith("-2"))) {
            logos.push(mxLibraryEntry(items.id, mxGraphModelXML((await axios.get(`https://landscape.cncf.io/logos/${items.id}.svg`)).data)))
        }

        fs.writeFileSync(`generated/${category.header.replace('/', '-')}.xml`, mxLibraryXML(logos))
    }
})();
