---
title: "Controller Implementation on a Rotary Inverted Pendulum"
codename: "PENDULUM"
fileNo: 2
kind: internship
org: "NIT Trichy"
location: "Tiruchirappalli, India"
supervisor: "Dr. D. Ezhilarasi"
start: 2024-12-01
status: ongoing
summary: "Linearized and stabilized a Quanser rotary inverted pendulum using pole placement, LQR, and gain-scheduled LQR, validated on real hardware."
tags: ["Control", "LQR", "Hardware"]
stack: ["MATLAB", "Simulink", "Quanser QUARC"]
metrics:
  - { label: "Steady-state error (20° setpoint, LQR)", value: "±4°" }
  - { label: "Settling time (20° setpoint, LQR)", value: "6 s" }
  - { label: "Gain-scheduled sweep range", value: "±45°" }
featured: true
classified: ["how many hardware resets the swing-up controller needed"]
cover: ./schematic.png
coverAlt: "Diagram of the rotary inverted pendulum: rotary arm angle theta and pendulum angle alpha, with lengths L_r and L_p labeled."
figures:
  - src: ./schematic.png
    caption: "System diagram: rotary arm (θ, L_r) driving a pendulum link (α, L_p/2 to centre of mass)."
  - src: ./hardware.jpg
    caption: "Quanser QUARC data-acquisition board wired to the rotary arm hardware."
  - src: ./pole-placement.png
    caption: "Pole-placement controller on hardware: setpoint tracking, tracking error, pendulum angle, and motor voltage."
  - src: ./gain-scheduled-lqr.png
    caption: "Gain-scheduled LQR tracking a growing setpoint sweep out to ±45°: stable, at a cost of tracking accuracy."
---

## Brief

The rotary inverted pendulum is a classic underactuated-control benchmark: a single motor voltage (SIMO input) must simultaneously drive the rotary arm to a setpoint and keep the pendulum balanced upright. This project derived the system's linearized model and implemented three controllers on a real Quanser setup, moving from simulation to hardware for each.

## Problem

The system is inherently unstable: linearizing about the upright equilibrium gives eigenvalues with one at zero and one on the positive real axis. As the setpoint angle grows, the pendulum's deviation exceeds the range where the first-order Taylor linearization holds, so a single fixed controller either can't be pushed to larger sweeps or overshoots badly trying.

## Approach

- Derived the system's equations of motion and linearized state-space model, validated against standard references.
- Designed a **pole-placement** controller: dominant conjugate poles chosen for an underdamped, fast-rising response, with the remaining (non-dominant) poles placed further into the left half-plane by a standard rule of thumb.
- Designed an **LQR** controller on the same linearized model, selecting Q and R weighting matrices to penalize state error and control effort.
- Extended to **gain-scheduled LQR**: a weaker controller taken over at higher pendulum-angle rates of change, so the setpoint can sweep across a much wider range than the linearization alone would support.
- Ran all three on the physical Quanser rotary pendulum, interfaced through Quanser's QUARC real-time hardware-in-the-loop toolchain.

## Results

LQR outperformed pole placement in both settling time and overshoot in simulation. On hardware, LQR achieved a steady-state error of ±4° with a 6-second settling time for a 20° setpoint. For larger excursions both pole placement and plain LQR fail to track; gain-scheduled LQR remained stable across a ±45° sweep, trading some setpoint-tracking accuracy for that stability margin.

## Status / Next

Ongoing. Current work is a swing-up controller to automate the transition from the pendant (hanging) position to upright, removing the need to start each hardware run with the pendulum manually raised, and further reducing overshoot in the gain-scheduled controller.
