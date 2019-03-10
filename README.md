# wiinode

A node library for the Nintendo<sup>®</sup> Wii Remote (Wiimote), using [node-hid](https://github.com/node-hid/node-hid).

## Installation

```
npm install --save wiinode
```

## Getting started

First, connect the Wiimotes to your computer.

Imports:

```
import { findRemotes, Remote } from 'wiinode';
```

Then call `findRemotes` to get a list of Wiimotes. You get `Remote` objects.

On the `Remote` object:

- Use `on` to register a button event listener (press or release).
- Read the properties to get button, accelerate, and/or IR camera data.
- Use `rumble`, `setLed`, or `setLeds` to write to the Wiimote.

More examples to follow...

See the wonderful [WiiBrew Wiki](https://wiibrew.org/wiki/Wiimote) for more technical details.

## Contribute

Do you have suggestions, ideas, or even code? Please contact me at http://thomasjacob.de/footer/contact.
