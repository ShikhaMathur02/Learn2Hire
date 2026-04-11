const subjectImageMap = {
  dsa: new URL('../assets/illustrations/subject-dsa.png', import.meta.url).href,
  dbms: new URL('../assets/illustrations/subject-dbms.png', import.meta.url).href,
  os: new URL('../assets/illustrations/subject-os.png', import.meta.url).href,
  cn: new URL('../assets/illustrations/subject-cn.png', import.meta.url).href,
  oop: new URL('../assets/illustrations/subject-oop.png', import.meta.url).href,
  'web-dev': new URL('../assets/illustrations/subject-webdev.png', import.meta.url).href,
  webdev: new URL('../assets/illustrations/subject-webdev.png', import.meta.url).href,
  'ai-ml': new URL('../assets/illustrations/subject-aiml.png', import.meta.url).href,
  aiml: new URL('../assets/illustrations/subject-aiml.png', import.meta.url).href,
  'interview-prep': new URL('../assets/illustrations/subject-interview.png', import.meta.url).href,
  interview: new URL('../assets/illustrations/subject-interview.png', import.meta.url).href,
  aptitude: new URL('../assets/illustrations/subject-aptitude.png', import.meta.url).href,
};

export function getSubjectImage(slug) {
  if (!slug) return null;
  const key = String(slug).toLowerCase().replace(/\s+/g, '-');
  return subjectImageMap[key] || null;
}
