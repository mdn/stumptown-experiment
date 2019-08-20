const fs = require('fs');
const path = require('path');

const matter = require('gray-matter');
const markdown = require('./markdown-converter');
const jsdom = require('jsdom');

const { JSDOM } = jsdom;

function extractFromSiblings(node, terminatorTags, contentType) {
    let content = '';
    let sib = node.nextSibling;
    while (sib && !terminatorTags.includes(sib.nodeName)) {
        if (sib.outerHTML) {
            if (contentType === 'html') {
                content += sib.outerHTML;
            } else if (contentType === 'text') {
                content += sib.textContent;
            }
        }
        sib = sib.nextSibling;
    }
    return content;
}

function packageValues(dom) {
    const values = [];
    const valueHeadings = dom.querySelectorAll('h3');
    for (let valueHeading of valueHeadings) {
        let value = {
            value: valueHeading.textContent,
            description: extractFromSiblings(valueHeading, ['H2', 'H3'], 'html')
        }
        values.push(value);
    }
    return values;
}

async function packageAttribute(attributePath) {
    const attributeMD = fs.readFileSync(attributePath, 'utf8');
    const {content} = matter(attributeMD);
    const contentHTML = await markdown.markdownToHTML(content);
    const dom = JSDOM.fragment(contentHTML);
    const attribute = {};
    // extract the name property
    const name = dom.querySelector('h1');
    attribute.name = name.textContent;

    // extract the description property
    attribute.description = extractFromSiblings(name, ['H2'], 'html');

    // extract the type property
    const h2Headings = dom.querySelectorAll('h2');
    const typeHeading = (h2Headings.length === 2)? h2Headings[1]: h2Headings[0];
    attribute.type = extractFromSiblings(typeHeading, 'H2', 'text');

    // extract the values property
    if (h2Headings.length === 2) {
        valuesHeading = h2Headings[0];
        attribute.values = packageValues(dom);
    }

    return attribute;
}

function packageAttributes(root) {
    const attributePaths = fs.readdirSync(root).map(relative => path.join(root, relative));
    return Promise.all(attributePaths.map(packageAttribute));
}

module.exports = {
    packageAttributes
}
