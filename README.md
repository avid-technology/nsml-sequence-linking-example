# Example that shows how linking between NSML story in MediaCentral | Newsroom Management (formally known as iNEWS)and MediaCentral | Production Management (formerly known as Interplay Production) sequence can be implemented


### Introduction
This example shows how you can link a Newsroom Management story with a Production Management  sequence using CTMS calls.

**!Important!** Only one sequence reference can be added into story.

NSML - News Story Markup Language (NSML). NSML is an SGML based markup which is used to express all the content and information about a story. 
NSML is used to express seven separate aspects of a story. 

NSML expresses meta information about a story in the `<head>` section; it expresses the appearance of the story when displayed in the `<form>` section; 
it expresses the story content in the `<fields>`, `<body>`, and `<aeset>` sections; 
and it expresses arbitrary attachments in the `<field-atts>` and `<aeset-atts>` sections.

To link a Production Management sequence with a Newsroom Management  story, you will need to add specific attribute, NrcsID, to the sequence.

NrcsID - is id that contains from components such:
*  INEWS system id
*  Path to the story
*  Story id

So, if tou have a global identifier that is :

```
"base": {
    "id": "SHOW.530PM.RUNDOWN..228772013.15671.15",
    "type": "story",
    "systemID": "INEWS",
    "systemType": "inews"
}
```

then your NrcsID is INEWS:SHOW.530PM.RUNDOWN:228772013.15671.15.

And NrcsID attribute for the Production Management sequence will look like:

```
{
    "name": "com.avid.workgroup.Property.User.NrcsID",
    "value": "INEWS:SHOW.530PM.RUNDOWN:228772013.15671.15",
    "type": "string",
    "value-labels": {
        "en": "INEWS:SHOW.530PM.RUNDOWN:228772013.15671.15"
    }
}
```

Next, you need to update your NSML for the story. 

To anchor the element to the story you need to add some tags to nsml. 

*  `<aeset>` tag - Defines the set of anchored elements within the story.
*  `<ae>` tag (inside `<aeset>` ) - Defines an anchored element.
   
    Attributes of `<ae>` tag:
    *  **id=** (required) - Its value is a decimal number that uniquely identifies the anchored element in the story so that it may be referenced and used. The id is referenced by the idref= attribute of the a_tag
within the `<body>` element of the NSML document. Each id is unique within an anchored element set
(`<aeset>`). The value of the number must be between 0 and 255 inclusive. In example it`s generated randomly.
    *  **uid=** The uid has to be unique within the story. The uid attribute must be globally unique identifiers. In example it`s generated using 'uuid' node module.
    *  **version=** It is typically a News Server version number or a News Client version number of the agent that created or modified the ancored element. The iNEWS
Server typically supplies version="S3.0". 
    *  **type=**  It is used to determine the type of information that may be contained in the anchored element. Known types are “G” (General), “M” (MOS), “V” (Video),
“J” (Journalist Editor). 

* `<hidden>` tag (inside `<ae>`) - Contains information relavant to an anchored element that is not for display. It is really metadata that is associated with the anchored element. 

Template of the info inside `<hidden>` tag:

```
    {
        "sequenceID": "your sequence id",
        "sequenceReference": [{
                    "base": { 
                        "id": "your sequence id", 
                        "type": "sequence", 
                        "systemType":"interplay-pam",
                        "systemID":"PAM system ID"
                    }
        }]
    }
```

* `<ap>` tag (inside `<ae>`) - Defines a paragraph in anchored element. 

Example of the `<aeset>`...`</aeset>` tag you need to add to your nsml:

```
<aeset>
    <ae id="20" uid="8f2068fd-df2b-4625-8155-ba358f1d7d01" version="C3.0" type="V">
        <hidden>{"sequenceID":"060a2b340101010101010f0013-000000-090400005d2100f8-060e2b347f7f-d080","sequenceReference":[{"base":{"id":"060a2b340101010101010f0013-000000-090400005d2100f8-060e2b347f7f-d080","type":"sequence","systemType":"interplay-pam","systemID":"85A27051-B6F6-48DD-96ED-2FF679C83807"}}]}</hidden>
        <ap>Video Sequence</ap>
    </ae>
</aeset>
```



### Prerequirements
**1. This example use standard modules, no external modules needed.** 

*   To work with request use standard module 'https', if you need extra functions in your code you can use any suitable module 'node-fetch', 'express', etc.
*   To converte XML to JavaScript object use 'xml2js' module. It supports bi-directional conversion. If you want to convert XML to json you can use 'xml2json' module.
*   To generate uuid use 'uuid' module. Support for RFC4122 version 1, 3, 4, and 5 UUIDs. In current example used version 4 UUID.

   
**2. Fill in the variables with your values:**
    
   Variables for authorization:
	
       const client_id = 'your_client_id';
       const client_sercet = 'your_secret_id';
       const cloud_ux_ip = 'your_cloudux_ip';
       const details = {
           grant_type : 'password', 
           username : 'username',
           password : 'password',
       }; 
  
  Main component variables:
	Set the components you need to link.
	
	  const sequence_id = 'sequence_asset_id';
      const story_id = 'story_asset_id';
	
