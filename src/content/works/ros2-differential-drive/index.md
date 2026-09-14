---
title: "ROS2-Based Differential Drive Bot"
codename: "DIFFDRIVE"
fileNo: 4
kind: project
org: "RMI, NIT Trichy"
location: "Tiruchirappalli, India"
start: 2025-09-01
status: ongoing
summary: "A ROS2 differential-drive bot fusing IMU, encoder, LiDAR, and depth-camera data for real-time localization and mapping, containerized for a Raspberry Pi 4."
tags: ["ROS2", "SLAM", "Sensor Fusion"]
stack: ["ROS2", "Gazebo", "RViz2", "Docker", "Raspberry Pi 4"]
featured: true
classified: ["how many nights were lost to the NED/ENU transform"]
cover: ./rviz-pointcloud.png
coverAlt: "RViz2 window showing a LiDAR/depth-camera pointcloud reconstruction of a room corner alongside the live camera feed."
figures:
  - src: ./rviz-pointcloud.png
    caption: "RViz2 visualizing the fused pointcloud from LiDAR and depth camera, with the live camera view inset."
  - src: ./joystick-teleop.jpg
    caption: "Joystick teleoperation of the bot, RViz2 and a target-marker view visible on screen."
  - src: ./madgwick-flowchart.png
    caption: "IMU signal-conditioning pipeline: the Madgwick filter fuses gyroscope and accelerometer readings into a drift-corrected orientation."
  - src: ./lidar-clutter.png
    caption: "Clutter-suppression filter in action across four LiDAR frames — green crosses mark true targets, red squares mark clutter."
---

## Brief

A barebone ROS2 differential-drive robot built to localize itself and map its surroundings — the standard first step toward autonomous navigation. The bot fuses IMU, motor-encoder, LiDAR, and depth-camera data to estimate its trajectory and build a spatial map in real time, entirely without GPS.

## Problem

Each sensor stream arrives noisy and asynchronous: encoder counts jitter, LiDAR returns are cluttered by dust and false reflections, and raw gyroscope integration drifts over time. Turning that into a usable pose estimate and map means building a signal-conditioning pipeline for each sensor before any SLAM algorithm can trust its inputs.

## Approach

- Designed the bot's XACRO description with LiDAR and depth camera, configured with `ros2_control`, and simulated in Gazebo.
- Built an IMU signal-conditioning pipeline: static/dynamic error calibration by curve fitting, then a **Madgwick filter** to fuse gyroscope and accelerometer readings — trusting the gyroscope for frame-to-frame orientation change, and correcting its drift against the accelerometer's gravity vector by gradient descent — followed by a low-pass filter to remove residual jitter.
- Built a LiDAR clutter-suppression filter: each return point is checked against range validity, intensity/SNR, spatial density (isolated points are likely dust or snow), and temporal stability across frames, before being kept as a valid target.
- Built a real-time encoder signal pipeline: ISR-based quadrature decoding, Welford's online algorithm for numerically stable streaming mean/variance, a Hampel filter for outlier rejection, and recursive least-squares for online dynamic-error compensation.
- Visualized the bot, pointcloud, and depth-camera output in RViz2, and drove the bot by joystick, mapping six joystick axes to differential-drive commands.
- Built a custom Dockerfile with ROS2 and the appropriate drivers so the same stack runs identically on a Raspberry Pi 4, and validated wireless control of the bot from that container.

## Results

A working differential-drive bot, simulated and driven live, with a validated sensor-conditioning pipeline for each of its three main sensor types (IMU, LiDAR, encoders) and a containerized deployment that runs unmodified on the target Raspberry Pi 4 hardware.

## Status / Next

Ongoing. Currently working on VSLAM and full `ros2_control` integration on the physical robot.
