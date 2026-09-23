"use client"

import { companyCountryOptions } from "@/lib/company-countries"
import Input from "@/modules/common/components/input"
import { Label, Select, Text } from "@medusajs/ui"
import { useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/provider"

type Province = { code: string; name: string }
type LocationValues = {
  company_country: string
  company_state: string
  company_city: string
}
type LoadStatus = "idle" | "loading" | "ready" | "error"

async function loadOptions<T>(country: string, state?: string): Promise<T[]> {
  const params = new URLSearchParams({ country })
  if (state) params.set("state", state)
  const response = await fetch(`/api/company-locations?${params}`)
  if (!response.ok) throw new Error("Unable to load locations")
  const data = await response.json()
  if (!Array.isArray(data.options)) throw new Error("Invalid location data")
  return data.options as T[]
}

export default function CompanyLocationFields({
  onChange,
  onReadyChange,
}: {
  onChange: (values: Partial<LocationValues>) => void
  onReadyChange: (ready: boolean) => void
}) {
  const { t } = useI18n()
  const [country, setCountry] = useState("")
  const [provinceCode, setProvinceCode] = useState("")
  const [province, setProvince] = useState("")
  const [district, setDistrict] = useState("")
  const [manualDistrict, setManualDistrict] = useState(false)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [provinceStatus, setProvinceStatus] = useState<LoadStatus>("idle")
  const [districtStatus, setDistrictStatus] = useState<LoadStatus>("idle")
  const provinceRequest = useRef(0)
  const districtRequest = useRef(0)
  const selectedCountry = companyCountryOptions.find((item) => item.name === country)

  const fetchProvinces = async (code: string) => {
    const request = ++provinceRequest.current
    setProvinceStatus("loading")
    onReadyChange(false)
    try {
      const options = await loadOptions<Province>(code)
      if (request !== provinceRequest.current) return
      setProvinces(options)
      setProvinceStatus("ready")
      if (options.length === 0) onReadyChange(true)
    } catch {
      if (request !== provinceRequest.current) return
      setProvinceStatus("error")
    }
  }

  const fetchDistricts = async (countryCode: string, stateCode: string) => {
    const request = ++districtRequest.current
    setDistrictStatus("loading")
    onReadyChange(false)
    try {
      const options = await loadOptions<string>(countryCode, stateCode)
      if (request !== districtRequest.current) return
      setDistricts(options)
      setDistrictStatus("ready")
      onReadyChange(true)
    } catch {
      if (request !== districtRequest.current) return
      setDistrictStatus("error")
    }
  }

  const selectCountry = (name: string) => {
    ++provinceRequest.current
    ++districtRequest.current
    setCountry(name)
    setProvince("")
    setProvinceCode("")
    setDistrict("")
    setManualDistrict(false)
    setProvinces([])
    setDistricts([])
    setDistrictStatus("idle")
    onChange({ company_country: name, company_state: "", company_city: "" })
    const code = companyCountryOptions.find((item) => item.name === name)?.code
    if (code) void fetchProvinces(code)
  }

  const selectProvince = (code: string) => {
    ++districtRequest.current
    const name = provinces.find((item) => item.code === code)?.name ?? ""
    setProvinceCode(code)
    setProvince(name)
    setDistrict("")
    setManualDistrict(false)
    setDistricts([])
    onChange({ company_state: name, company_city: "" })
    if (selectedCountry && code) void fetchDistricts(selectedCountry.code, code)
  }

  return (
    <>
      <div>
        <Label htmlFor="company-country-trigger">{t("Select a country")} *</Label>
        <Select name="company_country" required value={country} onValueChange={selectCountry}>
          <Select.Trigger id="company-country-trigger" data-testid="company-country-input" className="rounded-full h-10 px-4 w-full">
            <Select.Value placeholder={t("Select a country")} />
          </Select.Trigger>
          <Select.Content>
            {companyCountryOptions.map(({ code, name }) => (
              <Select.Item key={code} value={name}>{name}</Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      {provinceStatus === "ready" && provinces.length === 0 ? (
        <Input
          label={t("Company province")}
          name="company_state"
          autoComplete="address-level1"
          data-testid="company-state-input"
          className="bg-white"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value)
            onChange({ company_state: event.target.value })
          }}
        />
      ) : (
        <div>
          <Label htmlFor="company-state-trigger">{t("Select a province")} *</Label>
          <Select
            required={provinces.length > 0}
            value={provinceCode}
            onValueChange={selectProvince}
            disabled={provinceStatus !== "ready"}
          >
            <Select.Trigger id="company-state-trigger" data-testid="company-state-input" className="rounded-full h-10 px-4 w-full">
              <Select.Value placeholder={provinceStatus === "loading" ? t("Loading locations") : t("Select a province")} />
            </Select.Trigger>
            <Select.Content>
              {provinces.map(({ code, name }) => (
                <Select.Item key={code} value={code}>{name}</Select.Item>
              ))}
            </Select.Content>
          </Select>
          <input type="hidden" name="company_state" value={province} />
        </div>
      )}

      {(manualDistrict ||
        (districtStatus === "ready" && districts.length === 0) ||
        (provinceStatus === "ready" && provinces.length === 0)) ? (
        <Input
          label={t("Company area")}
          name="company_city"
          required
          autoComplete="address-level2"
          data-testid="company-city-input"
          className="bg-white"
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value)
            onChange({ company_city: event.target.value })
          }}
        />
      ) : (
        <div>
          <Label htmlFor="company-city-trigger">{t("Select a district")} *</Label>
          <Select
            required={districts.length > 0}
            value={district}
            onValueChange={(name) => {
              setDistrict(name)
              onChange({ company_city: name })
            }}
            disabled={districtStatus !== "ready"}
          >
            <Select.Trigger id="company-city-trigger" data-testid="company-city-input" className="rounded-full h-10 px-4 w-full">
              <Select.Value placeholder={districtStatus === "loading" ? t("Loading locations") : t("Select a district")} />
            </Select.Trigger>
            <Select.Content>
              {districts.map((name) => <Select.Item key={name} value={name}>{name}</Select.Item>)}
            </Select.Content>
          </Select>
          <input type="hidden" name="company_city" value={district} />
        </div>
      )}

      {districtStatus === "ready" && districts.length > 0 && (
        <button
          type="button"
          data-testid="company-area-manual-toggle"
          className="self-start text-sm text-ui-fg-base underline"
          onClick={() => {
            setManualDistrict((current) => !current)
            setDistrict("")
            onChange({ company_city: "" })
          }}
        >
          {manualDistrict ? t("Choose an area from the list") : t("Area not listed? Enter it")}
        </button>
      )}

      {(provinceStatus === "error" || districtStatus === "error") && (
        <Text role="alert" className="text-ui-fg-error">
          {t("Location list unavailable. Try again.")}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (districtStatus === "error" && selectedCountry && provinceCode) {
                void fetchDistricts(selectedCountry.code, provinceCode)
              } else if (selectedCountry) {
                void fetchProvinces(selectedCountry.code)
              }
            }}
          >
            {t("Retry")}
          </button>
        </Text>
      )}
    </>
  )
}