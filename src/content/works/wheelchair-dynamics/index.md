---
title: "Data Collection and Mathematical Modeling of Wheelchair Dynamics"
codename: "THRYV"
fileNo: 3
kind: internship
org: "R2D2 / Thryv Mobility, IIT Madras"
location: "Chennai, India"
start: 2025-05-01
end: 2025-07-31
status: completed
summary: "Derived a state-space model of wheelchair push dynamics from strain-gauge data collected across 40 subjects, and implemented a cruise-control proof of concept."
tags: ["Control", "Signal Processing", "Modeling"]
stack: ["MATLAB", "Signal Processing"]
metrics:
  - { label: "Subjects", value: "40" }
featured: false
---

## Brief

A summer internship with R2D2 / Thryv Mobility deriving the mathematical model behind a manual wheelchair's push dynamics, from real push-input data rather than assumed parameters.

## Problem

Manual wheelchair push behavior varies with the user's physique and push style. Before any control (like cruise assistance) can be added, the system needs a state-space model calibrated against real strain-gauge readings — which first have to be cleaned of sensor bias, slope error, and noise.

## Approach

- Derived the mathematical model and state-space representation of wheelchair dynamics.
- Aggregated push-input data from 40 subjects of varying physiques.
- Estimated the first-order equation of the strain gauges and calibrated it to remove bias and slope error.
- Filtered signal inputs with a moving-average filter and implemented a cruise-control algorithm as a proof of concept.

## Results

A calibrated first-order strain-gauge model and a state-space representation of push dynamics grounded in the 40-subject dataset, with a working cruise-control proof of concept on the filtered signal.

## Status / Next

Completed as a fixed-term internship.
