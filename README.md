# Forge Use Case Demo: Industrial Construction

![Platforms](https://img.shields.io/badge/platform-Windows|MacOS-lightgray.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D%2010.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

[![Viewer](https://img.shields.io/badge/Viewer-v6-green.svg)](http://forge.autodesk.com/en/docs/viewer/v6)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v2-green.svg)](https://forge.autodesk.com/en/docs/data/v2)
[![Model-Derivative](https://img.shields.io/badge/Model%20Derivative-v2-green.svg)](https://forge.autodesk.com/en/docs/model-derivative/v2)

Autodesk Forge sample application demonstrating features relevant to the area of industrial construction.

![Thumbnail](thumbnail.gif)

## Live demo

Master branch is deployed to https://forge-industrial-construction.autodesk.io.

## Development

### Prerequisites

- Node.js v10+
- [Forge](https://forge.autodesk.com) application credentials
- MongoDB database
  - for example, using the free tier of [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  - or running MongoDB locally: https://docs.mongodb.com/manual/installation

### Data preparation

The demo requires a Navisworks model that is split by area and discipline,
and individual NWD files in a Forge bucket to be named in the following format:

`<facility>-<area>-<discipline>.nwd`

Where _facility_ can be an arbitrary string, _area_ is a number, and _discipline_
is an arbitrary string as well. An example of such filename would be:

`austin-123-structural.nwd`

> If you'd like to use a different naming of files or different extensions,
> you can modify the parsing logic in https://github.com/petrbroz/forge-industrial-construction/blob/develop/routes/data.js#L64.

### Setup & Running

- clone this repository
- install dependencies: `npm install`
- run server with all the required env. variables
  - for example, on macOS:
    ```bash
    export FORGE_CLIENT_ID=<client-id>
    export FORGE_CLIENT_SECRET=<client-secret>
    export FORGE_BUCKET=<bucket-name>
    export GOOGLE_MAPS_API_KEY=<api-key>
    export MONGODB_URL=<mongodb-connection-string>
    npm start
    ```
  - or, when using [Visual Studio Code](https://code.visualstudio.com), add this configuration to your _.vscode/launch.json_:
  ```json
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Express Server",
            "program": "${workspaceFolder}/server.js",
            "env": {
                "FORGE_CLIENT_ID": "<client-id>",
                "FORGE_CLIENT_SECRET": "<client-secret>",
                "FORGE_BUCKET": "<bucket-name>",
                "GOOGLE_MAPS_API_KEY": "<api-key>",
                "MONGODB_URL": "<mongodb-connection-string>"
            }
        }
  ```
- go to http://localhost:3000

### Deployment

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## License

This sample is licensed under the terms of the [MIT License](https://tldrlegal.com/license/mit-license).

## Written by

Petr Broz ([@ipetrbroz](https://twitter.com/ipetrbroz)), Forge Partner Development Group
