"use client"

import { currencySymbolMap } from "@/lib/constants"
import { updateCompany } from "@/lib/data/companies"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import Select from "@/modules/common/components/native-select"
import {
  ModuleCompanySpendingLimitResetFrequency,
  StoreCompanyResponse,
  StoreUpdateCompany,
} from "@/types"
import { AdminRegionCountry, HttpTypes } from "@medusajs/types"
import { Container, Text, clx, toast } from "@medusajs/ui"
import { useState } from "react"
import { useI18n } from "@/lib/i18n/provider"

const CompanyCard = ({
  company,
  regions,
}: StoreCompanyResponse & { regions: HttpTypes.StoreRegion[] }) => {
  const [isEditing, setIsEditing] = useState(false)
  const { t } = useI18n()
  const [isSaving, setIsSaving] = useState(false)

  const { updated_at, created_at, employees, ...companyUpdateData } = company

  const [companyData, setCompanyData] = useState(
    companyUpdateData as StoreUpdateCompany
  )

  const handleSave = async () => {
    setIsSaving(true)
    await updateCompany(companyData).catch(() => {
      toast.error(t("Error updating company"))
    })
    setIsSaving(false)
    setIsEditing(false)

    toast.success(t("Company updated"))
  }

  const currenciesInRegions = Array.from(
    new Set(regions.map((region) => region.currency_code))
  )

  const countriesInRegions = Array.from(
    new Set(
      regions.flatMap((region) => region.countries).map((country) => country)
    )
  ) as AdminRegionCountry[]

  return (
    <div className="h-fit">
      <Container className="p-0 overflow-hidden">
        <form
          className={clx(
            "grid grid-cols-2 gap-4 border-b border-neutral-200 overflow-hidden transition-all duration-300 ease-in-out ",
            {
              "max-h-[422px] opacity-100 p-4": isEditing,
              "max-h-0 opacity-0": !isEditing,
            }
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleSave()
            }
          }}
        >
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Company Name")}</Text>
            <Input
              label={t("Company Name")}
              name="name"
              value={companyData.name || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Email")}</Text>
            <Input
              label={t("Email")}
              name="email"
              value={companyData.email || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, email: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Phone")}</Text>
            <Input
              label={t("Phone")}
              name="phone"
              value={companyData.phone || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, phone: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Address")}</Text>
            <Input
              label={t("Address")}
              name="address"
              value={companyData.address || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, address: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("City")}</Text>
            <Input
              label={t("City")}
              name="city"
              value={companyData.city || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, city: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("State")}</Text>
            <Input
              label={t("State")}
              name="state"
              value={companyData.state || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, state: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Zip")}</Text>
            <Input
              label={t("Zip")}
              name="zip"
              value={companyData.zip || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, zip: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Country")}</Text>
            <Select
              name="country"
              value={companyData.country || ""}
              onChange={(e) =>
                setCompanyData({ ...companyData, country: e.target.value })
              }
            >
              {countriesInRegions.map((country, index) => (
                <option key={index} value={country.id}>
                  {country.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Currency")}</Text>
            <Select
              name="currency_code"
              value={companyData.currency_code || ""}
              onChange={(e) =>
                setCompanyData({
                  ...companyData,
                  currency_code: e.target.value as string,
                })
              }
            >
              {currenciesInRegions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency.toUpperCase()} ({currencySymbolMap[currency]})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">
              {t("Spending Limit Reset Frequency")}
            </Text>
            <Select
              name="spending_limit_reset_frequency"
              value={companyData.spending_limit_reset_frequency || ""}
              onChange={(e) =>
                setCompanyData({
                  ...companyData,
                  spending_limit_reset_frequency: e.target
                    .value as ModuleCompanySpendingLimitResetFrequency,
                })
              }
            >
              {Object.values(ModuleCompanySpendingLimitResetFrequency).map(
                (value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                )
              )}
            </Select>
          </div>
        </form>
        <div
          className={clx(
            "grid grid-cols-2 gap-4 border-b border-neutral-200 transition-all duration-300 ease-in-out",
            {
              "opacity-0 max-h-0": isEditing,
              "opacity-100 max-h-[280px] p-4": !isEditing,
            }
          )}
        >
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Company Name")}</Text>
            <Text className=" text-neutral-500">{company.name}</Text>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Email")}</Text>
            <Text className=" text-neutral-500">{company.email}</Text>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Phone")}</Text>
            <Text className=" text-neutral-500">{company.phone}</Text>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Address")}</Text>
            <Text className=" text-neutral-500">
              {company.address}, {company.city}, {company.state}, {company.zip},{" "}
              {company.country?.toUpperCase()}
            </Text>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">{t("Currency")}</Text>
            <Text className=" text-neutral-500">
              {company.currency_code?.toUpperCase()} (
              {currencySymbolMap[company.currency_code!]})
            </Text>
          </div>
          <div className="flex flex-col gap-y-2">
            <Text className="font-medium text-neutral-950">
              {t("Spending Limit Reset Frequency")}
            </Text>
            <Text className=" text-neutral-500">
              {company.spending_limit_reset_frequency?.charAt(0).toUpperCase() +
                company.spending_limit_reset_frequency?.slice(1)}
            </Text>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-neutral-50 p-4">
          {isEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
              >
                {t("Save")}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              {t("Edit")}
            </Button>
          )}
        </div>
      </Container>
    </div>
  )
}

export default CompanyCard
