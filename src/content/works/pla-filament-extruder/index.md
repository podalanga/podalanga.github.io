---
title: "PLA Filament Extruder"
codename: "EXTRUDER"
fileNo: 8
kind: project
org: "NIT Trichy"
location: "Tiruchirappalli, India"
start: 2023-08-01
end: 2023-12-31
status: completed
summary: "Rebuilt a filament extruder that recycles failed 3D prints and PLA support structures back into usable filament."
tags: ["3D Printing", "Sustainability", "Hardware"]
stack: ["Arduino", "Heated Barrel-Screw Extrusion"]
metrics:
  - { label: "Filament thickness achieved", value: "≈1.5 mm" }
featured: false
cover: ./rig-full.jpg
coverAlt: "The full extruder rig on a workbench: hopper, heated barrel and screw, temperature controller, and a spool winder in the background."
figures:
  - src: ./rig-full.jpg
    caption: "The complete rig: hopper feeding the heated barrel-screw extruder, wired to a PID temperature controller."
  - src: ./barrel-closeup.png
    caption: "Close-up of the barrel, screw, and nozzle with cooling fans, mid-assembly."
---

## Brief

A rebuilt filament extruder that turns discarded PLA (failed prints and the support structures 3D printers generate as waste) back into usable filament, closing the loop on plastic waste from the printing process.

## Problem

Support-structure and failed-print waste from FDM 3D printing is typically discarded outright. Recycling it into new filament requires melting and re-extruding the plastic to a consistent diameter, using a machine simple enough to rebuild from off-the-shelf hardware.

## Approach

- Collected and sorted PLA waste, then ground it into pellets small enough for consistent heat flow through the extruder.
- Melted the pellets in a heated barrel-screw extrusion system, with a PID temperature controller and cooling fans regulating the melt.
- Shaped the molten plastic through a die-head nozzle to set filament diameter as it emerged from the barrel.
- Wound the cooled filament onto a reused spool.

## Results

Achieved a consistent filament thickness of approximately 1.5 mm, wound onto a reused spool and usable for further prints.

## Status / Next

Completed; the rebuilt extruder is usable for ongoing PLA-waste recycling.
