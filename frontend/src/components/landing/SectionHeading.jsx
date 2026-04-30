function SectionHeading({ title, description }) {
  return (
    <div className="mb-10 w-full max-w-none text-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base text-slate-700 sm:text-lg">{description}</p>
    </div>
  );
}

export default SectionHeading;
