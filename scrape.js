const playwright = require('playwright')
const {v4: uuidv4} = require('uuid')
const fs = require('fs')
const path = require('path')

function collectArg(arg, def) {
    let collected;

    for (let i = 0; i < process.argv.length; i++) {
        if (process.argv[i] === `-${arg}`) {
            collected = process.argv[i+1]
            break
        } if (process.argv[i].startsWith(`-${arg}=`)) {
            collected = process.argv[i].split(`-${arg}=`)[1]
            break
        }
    }

    if (!def) return collected
    if (collected) return collected
    return def
}

let username = collectArg('username', 'babybluebois')
const instaUrl = `https://www.instagram.com/${username}`
const localPath = collectArg('path')
const clearPath = Boolean(collectArg('clear', 'false'))
if (clearPath) {
    fs.readdir(localPath, (err, files) => {
        if (err) throw err
        
        for (const file of files) {
            fs.unlink(path.join(localPath, file), err => {
                if (err) throw err
            })
        }
    })
}

const addToList = (list, elts) => {
    elts.forEach(elt => {
        if (!list.includes(elt)) list.push(elt)
    })
    
    return list
}

const https = require('https')
const { getuid } = require('process')
//Node.js Function to save image from External URL.
function saveImageToDisk(url, localPath) {
    var fullUrl = url
    var file = fs.createWriteStream(localPath)
    var request = https.get(url, function(response) {
        response.pipe(file)
    })
}

const collectPost = async (page, link) => {
    let isVideo = true
    await page.goto(link)

    let numMedia = await page.$$eval('div.JSZAJ._3eoV-.IjCL9.WXPwG > .Yi5aA', elements => {
        return elements.length === 0 ? 1 : elements.length
    })

    let srcs = []
    srcs = addToList(srcs, await page.$$eval('video', elements => {
        return elements.map(element => element.src)
    }))
    if (srcs.length === 0) {
        isVideo = false
        srcs = addToList(srcs, await page.$$eval('div > div > div > div > img', elements => {
            return elements.map(element => element.src)
        }))
        numMedia--

        while (numMedia > 0) {
            await (await page.$('button._6CZji')).click()

            srcs = addToList(srcs, await page.$$eval('div > div > div > div > img', elements => {
                return elements.map(element => element.src)
            }))

            numMedia--
        }
    }

    srcs = srcs.filter(elt => elt !== '')

    srcs.forEach(src => saveImageToDisk(src, localPath + uuidv4() + (isVideo ? '.mp4' : '.jpg')))
}

(async () => {
    const browser = await playwright.chromium.launch()
    const page = await browser.newPage()

    await page.goto(instaUrl)

    const links = await page.$$eval('div.v1Nh3.kIKUG._bz0w > a', elements => {
        return elements.map(elt => elt.href)
    })

    for (let i = 0; i < links.length; i++)
        await collectPost(page, links[i])

    await browser.close()
})()