---
title: 'Mechanical Watch: Going Train and Swiss Lever Escapement'
codename: WATCH
fileNo: 9
kind: project
org: Independent
location: Tiruchirappalli, India
start: 2026-08-01
end: 2026-09-30
status: completed
summary: 'The basic mechanism of a mechanical watch, from mainspring barrel to balance, designed from first principles: thirteen parts driven by 393 linked equations, ogival NIHS 20-30 teeth, a Monte Carlo tolerance study, and a full contact simulation that ticks at 0.2498 s against a design value of 0.2500 s.'
tags:
  - Mechanical Design
  - Precision Mechanisms
  - Simulation
  - Tolerance Analysis
stack:
  - SolidWorks
  - SolidWorks Motion
metrics:
  - label: beats per hour (4 Hz balance)
    value: 28 800
  - label: simulated balance period vs 0.2500 s design
    value: 0.2498 s
  - label: predicted amplitude at 40 h (limit 150°)
    value: 185°
  - label: linked equations driving 13 parts
    value: '393'
cover: ./full-mechanism.jpg
coverAlt: 'The complete mechanism from the mainspring barrel on the left, through the going train and escapement, to the balance on the right: thirteen unique parts on one line of centres.'
figures:
  - src: ./escapement-balance.jpg
    caption: The Swiss lever escapement and the balance as modelled.
  - src: ./esc-layout.png
    caption: 'Layout of the escapement to scale (mm): 15-tooth escape wheel, pallet axis, banking pins and roller jewel.'
  - src: ./tooth-profile.png
    caption: An NIHS 20-30 ogival mesh. The constrained sketches reproduce the generated flanks to better than a nanometre.
  - src: ./amplitude.png
    caption: Predicted barrel torque and balance amplitude over the run. The redesigned barrel stays above 150° for 56 hours.
  - src: ./train-response.png
    caption: 'Rigid-body contact simulation of the complete train driven from the barrel: balance angle, escape wheel and fourth (seconds) wheel.'
  - src: ./escape-wheel.jpg
    caption: Escape wheel and pinion.
  - src: ./pallet-fork.jpg
    caption: Pallet fork with its two jewels.
  - src: ./mainspring.jpg
    caption: Mainspring inside the barrel.
  - src: ./hairspring.jpg
    caption: Hairspring (Nivarox), sized to give the balance a 4 Hz frequency.
videos:
  - url: https://www.youtube.com/watch?v=dhshj_wPEz8
    caption: Complete going train running in simulation, driven from the barrel.
  - url: https://youtu.be/M3oqJB_sfAk
    caption: Close-up of the Swiss lever escapement in motion.
documents:
  - label: Design, Analysis and Simulation of a Mechanical Watch Going Train with a Swiss Lever Escapement
    kind: short-report
    file: /media/attachments/watch-short-report.pdf
    permalink: watch-short-report
  - label: Full technical report, with every calculation worked step by step in the appendices
    kind: report
    file: /media/attachments/watch-report.pdf
    permalink: watch-report
featured: true
homeOrder: 2
---

## Brief

A mechanical watch stores about 0.15 J in a coiled spring and releases it over two days, through a mechanism that runs on about a microwatt. In this project I designed that mechanism from its requirements: the barrel and mainspring, a three-wheel going train, a Swiss lever escapement, and the balance with its hairspring. The aim was not a wearable movement but a design in which every dimension has a derivation, followed by a check that the result actually works. Bartosz Ciechanowski's illustrated article _Mechanical Watch_ was my reading and design inspiration only. None of its geometry, models or code is reused, and every part was modelled from an empty file.

## Problem

The requirements were 28 800 beats per hour (a 4 Hz balance) and at least 40 hours of running, with the balance still above 150° of amplitude at 40 hours. The amplitude also had to stay at most 315° at full wind, so that the roller jewel does not strike the outside of the fork. The fourth wheel must turn once per minute for the seconds hand and the second wheel once per hour. Every mesh must use the ogival NIHS 20-30 tooth form. The strength targets were a 5000 g shock and a ten-year service life of 1.26 × 10⁹ balance oscillations.

## Approach

- **One parametric model.** All thirteen unique parts are driven from a single SolidWorks file of 393 linked equations: 192 inputs drive 201 derived dimensions and check values. No sketch dimension is typed in, so the whole movement regenerates when a requirement changes.
- **Going train.** The meshes are 84/12, 60/8, 64/8 and 96/6, giving a train ratio of 6720. The rate closes exactly: 60 × 16 × 15 × 2 = 28 800 beats per hour. The barrel turns once in 7 hours.
- **Ogival teeth.** I generated the eight NIHS 20-30 profiles with an open-source tool and rebuilt them as constrained sketches. These match the generated working flanks to better than a nanometre and the roots to within 1.5 µm.
- **Contact and tolerances.** A contact analysis plus a 1000-sample Monte Carlo study per mesh set the centre-distance tolerances and the tooth widths. It showed a contact pressure of 913 MPa on the barrel teeth, so I doubled their width.
- **Springs and oscillator.** I sized the mainspring by beam theory against stress, with a preset radius for the inner coils. The Nivarox hairspring is matched to the balance's 3.59 mg·cm² inertia. The escapement follows the classical 15-tooth construction, with a 52° lift angle.
- **Checking everything from first principles.** A machine-element check of every load-carrying feature exposed **nine defects** and changed the model in seven places. The worst was the original barrel: it held the balance above its 150° limit for only about 19 hours instead of 40. The fixes were a redesigned barrel (module 0.120 → 0.140 mm, spring height 1.00 → 1.40 mm), a thicker barrel lid snapped into a groove, riveted wheels where a press fit proved unmanufacturable, and a corrected second-wheel tooth count.
- **Simulation.** I ran the mechanism as a rigid-body contact simulation in stages, each with a known expected result: the spring alone, then the fork and banking pins, then tooth contact, then the full train driven from the barrel. The default solver settings failed. I derived the integrator, step size and contact stiffness from the physics of a landing tooth.

## Results

- The balance period was **0.2498 s** against a design value of 0.2500 s, at 4.004 Hz. The 0.095 % difference comes from the CAD balance inertia, not the escapement, and a real watch removes it by regulation.
- The train followed the escapement at its **exact ratios** (to 10⁻⁷), with 8.01 beats per second and the fourth wheel turning 6.009° per second.
- The redesigned barrel gives a predicted 252°, 214° and 185° at 0, 24 and 40 hours, and stays above 150° for 56 hours.
- The simulation also identified two remaining issues: unequal lock on the two pallet stones and an amplitude that had not yet settled.

## Status / Next

Completed as a design study. Nothing has been built or measured yet. The frame and bearings are not designed, and the springs rest on beam theory. The next steps follow directly from the analysis: widen the barrel teeth to 0.70 mm, correct the stone positions to equalise the drop, and find the settled amplitude with friction applied. After that, both springs need finite-element analysis, and the frame needs jeweled bearings and shock settings.
