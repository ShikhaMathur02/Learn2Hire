function SectionHeading({ title, description }) {
  return (
    <div className="mb-8 w-full text-center sm:mb-10">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-6xl text-pretty text-sm leading-relaxed text-slate-700 sm:text-base md:text-lg">
        {description}
      </p>
    </div>
  );
}

export default SectionHeading;
