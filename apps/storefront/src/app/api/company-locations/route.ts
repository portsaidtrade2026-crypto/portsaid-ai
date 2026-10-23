import { City, Country, State } from "country-state-city"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get("country")?.toUpperCase()
  const state = searchParams.get("state")

  if (!country || !Country.getCountryByCode(country)) {
    return Response.json({ error: "Unknown country" }, { status: 400 })
  }
  if (state && !State.getStateByCodeAndCountry(state, country)) {
    return Response.json({ error: "Unknown province" }, { status: 400 })
  }

  const options = state
    ? City.getCitiesOfState(country, state)
        .map(({ name }) => name)
        .filter((name, index, names) => names.indexOf(name) === index)
        .sort((a, b) => a.localeCompare(b))
    : State.getStatesOfCountry(country)
        .map(({ isoCode, name }) => ({ code: isoCode, name }))
        .sort((a, b) => a.name.localeCompare(b.name))

  return Response.json({ options }, {
    headers: { "Cache-Control": "public, max-age=86400" },
  })
}