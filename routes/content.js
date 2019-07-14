var express = require('express');
var router = express.Router();
var async  = require('express-async-await')
var debug = require('debug')('api:server');
var request = require('request-promise');
const url = require('url');
var { parse } = require('node-html-parser')

router.get('/', async function(req, res, next) {
	console.log('url: ', req.query.url );
	let content = await fetchData(req.query.url)
	let root = parse(content)
	let response = []
	root.querySelectorAll('.garage-moto').forEach(htmlItem => {
		let img = htmlItem.querySelector('img')
		let title = htmlItem.querySelector('.moto-title')
		response.push({ html: htmlItem.toString(), moto:  title.text, href: title.attributes.href, img: {...img.attributes} }) 
	})
    res.send(response);
});


router.post('/', async function(req,res,next) {
	let fetchList = prepareFetchList(req.body)
	let content = await parseContent(await getData(fetchList));
	req.body = content
	next();
});

router.post('/', async function(req,res) {
	let content = await parseTopics(await getGarages(req.body))
	res.send(content);
});


const prepareFetchList = (hrefs) => {
	return hrefs.map(href => {
		return [href, href + '/journal']
	});

}

const parseContent = async (content) => {
	return content.map(bikeContent => {
		let [bikeInfo, topics] = bikeContent.map(item => parse(item))
		let topicsHrefs = []
		topics.querySelectorAll('.topic').forEach(topic => {
			let title = topic.querySelector('.title-topic');
			if (title) {
				topicsHrefs.push(encodeURI(title.attributes.href))
			}
		})
		return [
			bikeInfo.querySelector('.bpboard').toString(),
			topicsHrefs
		]
	})
}

const parseTopics = async (content) => {
	console.log('parseTopics', content)
	return content.map(bike => {
		let [info, topics] = bike
		if (topics.length > 0) {
			topics = topics.map(topic => {
				topic = parse(topic)
				return topic.querySelector('.topic').toString()
			})
		}
		return [info, topics]
	})
}

const getGarages = async (list) => {
	return await Promise.all(list.map(async itemArray => {
		return await Promise.all(itemArray.map(async content => {
			if (typeof content === 'string' || content.length === 0) {
				return content
			} else {
				return await Promise.all(content.map(href => fetchData(href)))
			}
		}))
	}))
}

const getData = async (list) => {
	return await Promise.all(list.map(async item => {
		return await Promise.all(item.map(href => fetchData(href)))
	}))
}
async function fetchData(addUrl){
	const options = {
	  uri: `https://cors-anywhere.herokuapp.com/` + addUrl,
	  method: 'GET',
	  headers: {
	    'X-Requested-With': 'origin'
	  }
	};
    return request(options);
}
module.exports = router;