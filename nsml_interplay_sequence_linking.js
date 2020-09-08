const https = require('https');
const xml2js = require('xml2js');
const uuid = require('uuid');
const parser = new xml2js.Parser({ attrkey: 'ATTR' });

const client_id = 'your_client_id';
const client_sercet = 'your_secret_id';
const cloud_ux_ip = 'your_cloudux_ip';
const basic_path = '/auth';
const basic_headers = {
    'Accept': 'application/json',
    'Content-type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
};
const ctms_registry_path = '/apis/avid.ctms.registry;version=0;realm=global';

const base64data = 'Basic ' + Buffer.from(client_id + ':' + client_sercet).toString('base64');

const headers_auth = {
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': base64data,
};

const details = {
    grant_type : 'password', 
    username : 'username',
    password : 'password',
};

const formBody = Object.keys(details).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key])).join('&');


const sequence_id = 'sequence_asset_id';
const story_id = 'story_asset_id';
const attr_body_template = {
    'attributes': [
        {
            'name': 'com.avid.workgroup.Property.User.NrcsID',
            'value': '',
            'type': 'string',
            'value-labels': {
                'en': '',
            },
        },
    ],
};

function body_constructor(template, s_id, inews_systemID) {
    const q_name = s_id.split('..')[0];
    const q_locator = s_id.split('..')[1];
    template.attributes[0].value = inews_systemID + ':' + q_name + ':' + q_locator;
    template.attributes[0]['value-labels'].en = inews_systemID + ':' + q_name + ':' + q_locator;
    return template;
} 

async function get_url(upstream, path, headers, method, postData = '') {
    return new Promise((resolve, reject) => {
        const url_request = https.request(
            {
                host: upstream,
                path: path,
                method: method,
                headers: headers,
            }, 
        
            (result) => {
                result.on('data', (d) => {
                    const result_link = JSON.parse(d);
                    resolve(result_link);
                });
            });
        
        url_request.on('error', (error) => {
            console.log('ERROR ' + error);
        });
        url_request.write(postData);

        url_request.end();
    });
}

async function nsml_req_parse(upstream, path, headers, method, postBody = '') {
    return new Promise((resolve, reject) => {
        const nsml_request = https.request(
            {
                host: upstream,
                path: path,
                method: method,
                headers: headers,
            }, 
        
            (res) => {
                let data = '';
                res.on('data', (stream) => {
                    data += stream;
                });
                res.on('end', function() {
                    parser.parseString(data, function(error, result) {
                        resolve(result);
                    });
                });
            });
        nsml_request.on('error', (error) => {
            console.log('ERROR ' + error);
        });
        nsml_request.write(postBody);
        nsml_request.end();
    });
}

function find_by_sys_name(serviceroot, str, sys_name) {
    let result = '';
    for (let i = 0; i < serviceroot.resources[str].length; i++) {
        if (serviceroot.resources[str][i].href.includes(sys_name)) {
            result = serviceroot.resources[str][i].href;
        }
    }
    return result;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

const main_func = async () => {
    let auth = await get_url(cloud_ux_ip, basic_path, basic_headers, 'GET');
    auth = auth._links['auth:identity-providers'][0].href;
    let sso_link = await get_url(cloud_ux_ip, new URL(auth).pathname, basic_headers, 'GET');
    sso_link = sso_link._embedded['auth:identity-provider'][1]._links['auth:ropc-default'][0].href;
    let access_token = await get_url(cloud_ux_ip, new URL(sso_link).pathname, headers_auth, 'POST', formBody);
    access_token = access_token.access_token;
    const request_headers = {
        'Content-Type': 'application/hal+json;charset=UTF-8',
        Authorization: ' Bearer ' + access_token,
    };
    let ctms_registry = await get_url(cloud_ux_ip, ctms_registry_path, request_headers, 'GET');
    ctms_registry = ctms_registry._links['registry:serviceroots'].href;
    ctms_registry = ctms_registry.split('{')[0];
    const serviceroot = await get_url(cloud_ux_ip, new URL(ctms_registry).pathname, request_headers, 'GET');
    let Inews_systemID = '';
    let PAM_systemID = '';
    for (let i = 0; i < serviceroot.systems.length; i++) {
        if (serviceroot.systems[i].systemType === 'inews') {
            Inews_systemID = serviceroot.systems[i].systemID;
        }
        if (serviceroot.systems[i].systemType === 'interplay-pam') {
            PAM_systemID = serviceroot.systems[i].systemID;
        }
    }
    const pam_update_attr_by_id = find_by_sys_name(serviceroot, 'aa:update-attributes-by-id', 'avid.pam');
    let inews_asset_by_id = find_by_sys_name(serviceroot, 'aa:asset-by-id', 'avid.inews');
    inews_asset_by_id = inews_asset_by_id.split('{')[0];
    const inews_asset_by_id_response = await get_url(cloud_ux_ip, new URL(inews_asset_by_id).pathname + story_id, request_headers, 'GET');
    const inews_update_asset = inews_asset_by_id_response._links['aa:update-asset'].href;
    const inews_update_asset_type = inews_asset_by_id_response._links['aa:update-asset'].type;
    const inews_asset_nsml = inews_asset_by_id_response._links['ia:asset-nsml'].href;
    const inews_lock_asset = inews_asset_by_id_response._links['ia:lock-asset'].href;
    const nsml_result = await nsml_req_parse(cloud_ux_ip, new URL(inews_asset_nsml).pathname, request_headers, 'GET');
    const body = body_constructor(attr_body_template, story_id, Inews_systemID);
    const url_constructor = new URL(pam_update_attr_by_id.split('{')[0]).pathname + sequence_id + pam_update_attr_by_id.split('}')[1];
    const sequence_attr_update = await get_url(cloud_ux_ip, url_constructor, request_headers, 'PATCH', JSON.stringify(body));
    const nsml_template = nsml_result;
    const id = getRandomInt(255);
    const nsml_body = {
        'ae': [
            {
                'ATTR': { 'id' : id, 'uid': uuid.v4(), 'version': 'C3.0', 'type': 'V'},
                'hidden': ['put'],
                'ap': ['Video Sequence'],
            },
        ],
    };
    const nsml_sequence_info = {
        'sequenceID': sequence_id, 
        'sequenceReference': [
            {
                'base': {
                    'id': sequence_id,
                    'type': 'sequence',
                    'systemType': 'interplay-pam',
                    'systemID': PAM_systemID,
                },
            },
        ],
    };
    console.log(nsml_template);
    nsml_template.nsml.aeset = [nsml_body];
    nsml_template.nsml.body = {'ATTR':{'findent':'0', 'tabs': '24'}, 'p': [{'a': [{'ATTR': {'idref': id}}]}, {'sb': ['']}]}; 
    const builder = new xml2js.Builder({ attrkey: 'ATTR' });
    const xml = builder.buildObject(nsml_template);
    console.log(xml.split('put')[0] + JSON.stringify(nsml_sequence_info) + xml.split('put')[1]);
    let lock_id = await get_url(cloud_ux_ip, new URL(inews_lock_asset.split('{')[0]).pathname + '?section=all', request_headers, 'POST');
    lock_id = lock_id.lockId;
    const nsml_headers = {
        Authorization: ' Bearer ' + access_token,
        'Content-type': 'application/vnd.com.avid.inews.nsml+xml',
    };
    const body_to_post = xml.split('put')[0].replace('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '') + JSON.stringify(nsml_sequence_info) + xml.split('put')[1];
    const nsml_post = await nsml_req_parse(cloud_ux_ip, new URL(inews_asset_by_id).pathname + story_id + '?lockId=' + lock_id + '&unlock=false', nsml_headers, 'PATCH', body_to_post);
    console.log(nsml_post);
};

console.log(main_func());
