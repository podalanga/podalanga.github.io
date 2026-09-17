import { describe, expect, it } from 'vitest';
import { citationsFor, formatFileNo, normalise, type CitableWork } from './skill-citations';

function work(fileNo: number, codename: string, stack: string[], tags: string[] = []): CitableWork {
  return { fileNo, slug: codename.toLowerCase(), codename, stack, tags };
}

const WORKS: CitableWork[] = [
  work(1, 'ZBOT', ['ROS2', 'Gazebo', 'RViz2', 'Docker'], ['ROS2', 'SLAM']),
  work(2, 'PENDULUM', ['MATLAB', 'Signal Processing'], ['Control', 'Modeling']),
  work(3, 'THRYV', ['MuJoCo', 'Python', 'FARMS'], ['Control', 'Simulation']),
  work(6, 'ARM-3R', ['SolidWorks', 'onshape-to-robot'], ['CAD', 'Kinematics']),
  work(8, 'EXTRUDER', ['Arduino'], ['3D Printing', 'Hardware']),
];

describe('normalise', () => {
  it('lowercases and strips punctuation and spaces', () => {
    expect(normalise('Python / Cython')).toBe('pythoncython');
    expect(normalise('Kinematics & Dynamics')).toBe('kinematicsdynamics');
    expect(normalise('  ROS2  ')).toBe('ros2');
  });
});

describe('citationsFor', () => {
  it('matches a term spelled identically in a work stack', () => {
    expect(citationsFor('MuJoCo', WORKS).map((c) => c.fileNo)).toEqual([3]);
  });

  it('matches case-insensitively', () => {
    expect(citationsFor('gazebo', WORKS).map((c) => c.fileNo)).toEqual([1]);
  });

  it('matches against tags as well as stack', () => {
    expect(citationsFor('Kinematics', WORKS).map((c) => c.fileNo)).toEqual([6]);
  });

  it('bridges an authoring mismatch through the alias table', () => {
    expect(citationsFor('Python / Cython', WORKS).map((c) => c.fileNo)).toEqual([3]);
  });

  it('returns every matching file, ordered by file number', () => {
    const multi = citationsFor('Control', WORKS).map((c) => c.fileNo);
    expect(multi).toEqual([2, 3]);
  });

  it('deduplicates a work that matches through both stack and tags', () => {
    expect(citationsFor('ROS2', WORKS).map((c) => c.fileNo)).toEqual([1]);
  });

  it('returns nothing for a term no case file evidences', () => {
    expect(citationsFor('COMSOL', WORKS)).toEqual([]);
  });

  it('does not substring-match a shorter term into a longer one', () => {
    // "C" must not match "CAD", and "Arduino" must not be found via "onshape-to-robot".
    expect(citationsFor('C', WORKS)).toEqual([]);
  });

  it('normalises the work side too, so "3D Printing" is reachable', () => {
    expect(citationsFor('3D Printing', WORKS).map((c) => c.fileNo)).toEqual([8]);
  });

  it('carries the slug and codename through for linking', () => {
    expect(citationsFor('SolidWorks', WORKS)).toEqual([
      { fileNo: 6, slug: 'arm-3r', codename: 'ARM-3R' },
    ]);
  });
});

describe('formatFileNo', () => {
  it('pads to three digits', () => {
    expect(formatFileNo(3)).toBe('003');
    expect(formatFileNo(12)).toBe('012');
  });
});
