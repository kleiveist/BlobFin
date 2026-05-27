# Immobilienfinanzierung: Stabile Feld-IDs

Die Eingaben im Modul `Immobilienfinanzierung` verwenden stabile IDs mit Prefix `propertyFinancing.*`.
Diese IDs sind fuer Persistenz, Import/Export und spaetere AI-Chat-Integration vorgesehen.

## Immobilien-Eckdaten

- `propertyFinancing.purchasePrice`
- `propertyFinancing.constructionOrRenovationCosts`
- `propertyFinancing.landCosts`
- `propertyFinancing.additionalPurchaseCosts`
- `propertyFinancing.notaryCosts`
- `propertyFinancing.landRegistryCosts`
- `propertyFinancing.brokerCosts`
- `propertyFinancing.transferTax`
- `propertyFinancing.modernizationReserve`
- `propertyFinancing.movingAndSetupCosts`
- `propertyFinancing.safetyBuffer`

## Finanzierungsdaten

- `propertyFinancing.equityCapital`
- `propertyFinancing.loanAmount`
- `propertyFinancing.interestRatePercent`
- `propertyFinancing.initialRepaymentPercent`
- `propertyFinancing.monthlyPayment`
- `propertyFinancing.fixedInterestYears`
- `propertyFinancing.targetTermYears`
- `propertyFinancing.financingYears`
- `propertyFinancing.specialRepaymentAmount`
- `propertyFinancing.specialRepaymentRhythm`
- `propertyFinancing.remainingDebtAfterFixedInterest`

## Strategie und Annahmen

- `propertyFinancing.plannedSaleYear`
- `propertyFinancing.estimatedSaleValue`
- `propertyFinancing.targetFullRepaymentYear`
- `propertyFinancing.targetMonthlyBurden`
- `propertyFinancing.maxMonthlyBurden`
- `propertyFinancing.subsidyAmount`
- `propertyFinancing.propertyValueGrowthPercent`
- `propertyFinancing.inflationRatePercent`
- `propertyFinancing.manualFuturePropertyValue`
