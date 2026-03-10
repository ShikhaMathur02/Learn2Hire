function SectionHeading({ title, description }) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-lg text-slate-600">{description}</p>
    </div>
  );
}

export default SectionHeading;
