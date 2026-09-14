export interface EducationEntry {
  institution: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  detail: string;
  coursework: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface AwardEntry {
  title: string;
  detail: string;
}

export interface PositionEntry {
  role: string;
  org: string;
  start: string;
  end: string;
  detail: string;
}

export const education: EducationEntry[] = [
  {
    institution: 'National Institute of Technology, Tiruchirappalli',
    degree: 'B.Tech, Instrumentation & Control Engineering (Minor: Computer Applications)',
    location: 'Tiruchirappalli, India',
    start: 'Aug 2023',
    end: 'Present',
    detail: 'CGPA 8.5 / 10',
    coursework: [
      'Control Systems',
      'Data Analytics',
      'Pattern Recognition',
      'Signal Processing',
      'IoT',
      'Fuzzy Logic',
    ],
  },
  {
    institution: 'Indian Institute of Technology Madras',
    degree: 'BS, Data Science & Applications',
    location: 'Chennai, India',
    start: 'Aug 2023',
    end: 'Present',
    detail: 'CGPA 8.91 / 10',
    coursework: [
      'Statistics',
      'System Commands',
      'Data Structures & Algorithms',
      'DBMS',
      'Modern Application Development',
    ],
  },
];

export const skillGroups: SkillGroup[] = [
  {
    label: 'Programming & Frameworks',
    items: ['Python / Cython', 'C', 'C++', 'ROS2', 'MATLAB', 'Bash', 'Git', 'Docker', 'ESP-IDF', 'PostgreSQL'],
  },
  {
    label: 'Robotics & Control',
    items: [
      'System Modeling',
      'Kinematics & Dynamics',
      'PID Control',
      'Pole Placement',
      'LQR Control',
      'Observer Design',
      'Decoupler Design',
      'Machine Learning',
      'NumPy',
      'OpenCV',
      'TensorFlow',
    ],
  },
  {
    label: 'Simulation & Design',
    items: ['Gazebo', 'MuJoCo', 'CoppeliaSim', 'Simulink', 'SolidWorks', 'COMSOL', 'Stonefish', 'MeshLab', 'Blender'],
  },
  {
    label: 'Hardware & Sensors',
    items: ['Raspberry Pi', 'NVIDIA Jetson', 'Arduino', 'ESP32', 'Intel RealSense', 'RPLIDAR', '3D Printing'],
  },
  {
    label: 'Miscellaneous',
    items: [
      'Self-Hosting Local Servers',
      'Web Development',
      'Local LLM Hosting',
      'KVM GPU Pass-Through Without Virtualization',
    ],
  },
];

export const awards: AwardEntry[] = [
  {
    title: 'CSWA SolidWorks Certification',
    detail: 'Perfect score in the modeling and assembly category.',
  },
  {
    title: 'District-Level Toastmasters Humorous Speech Contest',
    detail: '1st place.',
  },
  {
    title: 'District-Level Toastmasters Speech Evaluation Contest',
    detail: '2nd place.',
  },
];

export const positions: PositionEntry[] = [
  {
    role: 'Technical Head',
    org: 'Robotics and Machine Intelligence (RMI), NIT Trichy',
    start: 'Aug 2024',
    end: 'Present',
    detail:
      "RMI is NIT Trichy's official robotics and technical research club. Managing all technical projects and mentoring club members, with active participation in robotics competitions, exhibitions, and educational workshops for school students.",
  },
  {
    role: 'Ex-Secretary',
    org: 'Toastmasters NITT Chapter',
    start: 'Apr 2024',
    end: 'Present',
    detail:
      "Served as Secretary for NIT Trichy's official Toastmasters club, coordinating administrative activities alongside public-speaking and leadership practice.",
  },
];
