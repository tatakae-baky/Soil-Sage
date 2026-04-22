import { Link } from 'react-router-dom'

/**
 * Public landing — warm white canvas, Rausch Red CTA,
 * near-black headings, generous spacing per DESIGN.md.
 */
export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-[28px] font-bold leading-[1.43] tracking-normal text-[#222222]">
          Soil Sage
        </h1>
        <p className="mt-3 text-[16px] font-medium leading-[1.25] text-[#6a6a6a]">
          AI-assisted farming intelligence — manage land, rentals, community,
          and inventory in one place.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/login"
            className="rounded-[8px] bg-[#222222] px-6 py-3 text-[16px] font-medium text-white transition hover:bg-[#3d7a52]"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-[8px] border border-[#dddddd] px-6 py-3 text-[16px] font-medium text-[#222222] transition hover:shadow-hover"
          >
            Create account
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg gap-6 text-left sm:grid-cols-2">
          {[
            ['Land management', 'Register land with GPS, soil, and crop details.'],
            ['Rental system', 'Browse available plots and send rental requests.'],
            ['Community forum', 'Join communities, post questions, and discuss practices.'],
            ['Smart inventory', 'Track seeds, tools, and fertilizers with AI insights.'],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-[20px] bg-white p-5 shadow-card"
            >
              <h3 className="text-[16px] font-semibold text-[#222222]">
                {title}
              </h3>
              <p className="mt-1 text-[14px] leading-[1.43] text-[#6a6a6a]">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
