import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import {
  DbProject,
  DbSite,
  DbBlock,
  DbHalfBlock,
  DbUnit,
  DbScenario,
  DbProjectConstructionCost,
  DbProjectHousingType,
  DbProjectEquipmentUtilityType,
  DbScenarioHousingType,
  DbScenarioConstructionCost,
} from '@/types';
import {
  BUILDING_TYPES,
  HOUSING_TYPES,
  VILLA_LAYOUTS,
  APARTMENT_LAYOUTS,
} from '@/constants/typologies';

interface ExportData {
  project: DbProject;
  sites: DbSite[];
  blocks: DbBlock[];
  halfBlocks: DbHalfBlock[];
  units: DbUnit[];
  scenarios: DbScenario[];
  projectConstructionCosts: DbProjectConstructionCost[];
  projectHousingTypes: DbProjectHousingType[];
  projectEquipmentUtilityTypes: DbProjectEquipmentUtilityType[];
  scenarioHousingTypes: DbScenarioHousingType[];
  scenarioConstructionCosts: DbScenarioConstructionCost[];
  goldPrice: number;
}

interface ScenarioSummary {
  scenario: DbScenario;
  site: DbSite;
  totalUnits: number;
  totalBuildArea: number;
  totalCosts: number;
  totalRevenue: number;
  surplus: number;
  surplusPercent: number;
  breakEvenMonths: number;
  unitsByType: { [key: string]: { count: number; area: number; rent: number; cost: number } };
}

function calculateScenarioSummary(
  scenario: DbScenario,
  site: DbSite,
  data: ExportData
): ScenarioSummary {
  const siteBlocks = data.blocks.filter(b => b.site_id === site.id);
  const scenarioHousingTypes = data.scenarioHousingTypes.filter(h => h.scenario_id === scenario.id);
  const scenarioConstructionCosts = data.scenarioConstructionCosts.filter(c => c.scenario_id === scenario.id);
  
  const mergedHousingTypes = scenarioHousingTypes.length > 0 
    ? scenarioHousingTypes 
    : data.projectHousingTypes.filter(h => h.project_id === data.project.id);
  
  const mergedConstructionCosts = scenarioConstructionCosts.length > 0
    ? scenarioConstructionCosts
    : data.projectConstructionCosts.filter(c => c.project_id === data.project.id);

  let totalUnits = 0;
  let totalBuildArea = 0;
  let totalCosts = 0;
  let totalRevenue = 0;
  const unitsByType: { [key: string]: { count: number; area: number; rent: number; cost: number } } = {};

  siteBlocks.forEach(block => {
    const blockHalfBlocks = data.halfBlocks.filter(hb => hb.block_id === block.id);
    
    blockHalfBlocks.forEach(hb => {
      const halfBlockUnits = data.units.filter(u => u.half_block_id === hb.id);

      if (hb.type === 'villas' && hb.villa_layout) {
        halfBlockUnits.forEach(unit => {
          if (unit.unit_type === 'villa' && unit.size_m2) {
            totalUnits++;
            const villaType = unit.building_type || 'BMS';
            
            const housing = mergedHousingTypes.find(h => h.code === villaType);
            const housingConfig = HOUSING_TYPES[villaType];
            const buildArea = housing?.default_area_m2 || housingConfig?.defaultArea || unit.size_m2 * 0.3;
            const rentMonthly = housing?.default_rent_monthly || housingConfig?.defaultRent || 500000;
            const costTypeCode = housing?.default_cost_type || housingConfig?.defaultCostType || 'ZME';
            
            const costParam = mergedConstructionCosts.find(c => c.code === costTypeCode);
            const costPerM2 = costParam ? costParam.gold_grams_per_m2 * data.goldPrice : 1000;
            const unitCost = buildArea * costPerM2;

            if (!unitsByType[villaType]) {
              unitsByType[villaType] = { count: 0, area: buildArea, rent: rentMonthly, cost: unitCost };
            }
            unitsByType[villaType].count++;

            totalBuildArea += buildArea;
            totalCosts += unitCost;
            totalRevenue += rentMonthly * 12 * (scenario.rental_period_years || 20);
          }
        });
      } else if (hb.type === 'apartments' && hb.apartment_layout) {
        const buildingConfig = BUILDING_TYPES.find(bt => bt.id === hb.apartment_layout);
        const numApartmentBuildings = halfBlockUnits.filter(u => u.unit_type === 'apartment').length;

        if (buildingConfig?.units) {
          Object.entries(buildingConfig.units).forEach(([unitType, countPerBuilding]) => {
            const totalCount = countPerBuilding * numApartmentBuildings;
            totalUnits += totalCount;

            const housing = mergedHousingTypes.find(h => h.code === unitType);
            const housingConfig = HOUSING_TYPES[unitType];
            const buildArea = housing?.default_area_m2 || housingConfig?.defaultArea || 80;
            const rentMonthly = housing?.default_rent_monthly || housingConfig?.defaultRent || 300000;
            const costTypeCode = housing?.default_cost_type || housingConfig?.defaultCostType || 'ZME';
            
            const costParam = mergedConstructionCosts.find(c => c.code === costTypeCode);
            const costPerM2 = costParam ? costParam.gold_grams_per_m2 * data.goldPrice : 900;
            const unitCost = buildArea * costPerM2;

            if (!unitsByType[unitType]) {
              unitsByType[unitType] = { count: 0, area: buildArea, rent: rentMonthly, cost: unitCost };
            }
            unitsByType[unitType].count += totalCount;

            totalBuildArea += buildArea * totalCount;
            totalCosts += unitCost * totalCount;
            totalRevenue += rentMonthly * 12 * (scenario.rental_period_years || 20) * totalCount;
          });
        }
      }
    });
  });

  const surplus = totalRevenue - totalCosts;
  const surplusPercent = totalCosts > 0 ? (surplus / totalCosts) * 100 : 0;
  const monthlyRevenue = totalRevenue / ((scenario.rental_period_years || 20) * 12);
  const breakEvenMonths = monthlyRevenue > 0 ? totalCosts / monthlyRevenue : 0;

  return {
    scenario,
    site,
    totalUnits,
    totalBuildArea,
    totalCosts,
    totalRevenue,
    surplus,
    surplusPercent,
    breakEvenMonths,
    unitsByType,
  };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' XOF';
}

function formatBreakEven(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = Math.round(months % 12);
  if (remainingMonths > 0) {
    return `${years} years ${remainingMonths} months`;
  }
  return `${years} years`;
}

function getLayoutName(hb: DbHalfBlock): string {
  if (hb.type === 'villas' && hb.villa_layout) {
    const layout = VILLA_LAYOUTS.find(l => l.id === hb.villa_layout);
    return layout?.name || hb.villa_layout;
  }
  if (hb.type === 'apartments' && hb.apartment_layout) {
    const layout = APARTMENT_LAYOUTS.find(l => l.id === hb.apartment_layout);
    return layout?.name || hb.apartment_layout;
  }
  return 'Not configured';
}

function getLayoutImage(hb: DbHalfBlock): string | undefined {
  if (hb.type === 'villas' && hb.villa_layout) {
    const layout = VILLA_LAYOUTS.find(l => l.id === hb.villa_layout);
    return layout?.imageUrl;
  }
  if (hb.type === 'apartments' && hb.apartment_layout) {
    const layout = APARTMENT_LAYOUTS.find(l => l.id === hb.apartment_layout);
    return layout?.imageUrl;
  }
  return undefined;
}

export function generatePDFHTML(data: ExportData): string {
  const { project, sites, blocks, halfBlocks, scenarios } = data;
  
  const scenarioSummaries: ScenarioSummary[] = scenarios.map(scenario => {
    const site = sites.find(s => s.id === scenario.site_id);
    if (!site) return null;
    return calculateScenarioSummary(scenario, site, data);
  }).filter((s): s is ScenarioSummary => s !== null);

  let sitesHTML = '';
  sites.forEach(site => {
    const siteBlocks = blocks.filter(b => b.site_id === site.id);
    const siteScenarios = scenarios.filter(s => s.site_id === site.id);
    
    let blocksHTML = '';
    siteBlocks.forEach(block => {
      const blockHalfBlocks = halfBlocks.filter(hb => hb.block_id === block.id);
      const northHb = blockHalfBlocks.find(hb => hb.position === 'north');
      const southHb = blockHalfBlocks.find(hb => hb.position === 'south');
      
      const northImage = northHb ? getLayoutImage(northHb) : undefined;
      const southImage = southHb ? getLayoutImage(southHb) : undefined;
      const northName = northHb ? getLayoutName(northHb) : 'Not configured';
      const southName = southHb ? getLayoutName(southHb) : 'Not configured';

      blocksHTML += `
        <div class="block-item">
          <div class="block-header">Block ${block.block_number}</div>
          <div class="half-blocks-visual">
            <div class="half-block-visual-item north">
              <div class="hb-label north">N: ${northName}</div>
              ${northImage 
                ? `<img src="${northImage}" class="hb-image" />` 
                : `<div class="hb-placeholder">No Layout</div>`
              }
            </div>
            <div class="half-block-visual-item south">
              <div class="hb-label south">S: ${southName}</div>
              ${southImage 
                ? `<img src="${southImage}" class="hb-image rotated" />` 
                : `<div class="hb-placeholder">No Layout</div>`
              }
            </div>
          </div>
        </div>
      `;
    });

    let scenariosHTML = '';
    siteScenarios.forEach(scenario => {
      const summary = scenarioSummaries.find(s => s.scenario.id === scenario.id);
      if (!summary) return;

      const isExtreme = scenario.name.includes('Extreme') || scenario.name.includes('🔴');
      const isAuto = scenario.is_auto_scenario && !isExtreme;

      let unitsBreakdownHTML = '';
      Object.entries(summary.unitsByType).forEach(([type, info]) => {
        const housingConfig = HOUSING_TYPES[type];
        const name = housingConfig?.name || type;
        unitsBreakdownHTML += `
          <tr>
            <td>${type}</td>
            <td>${name}</td>
            <td class="number">${info.count}</td>
            <td class="number">${info.area.toFixed(0)} m²</td>
            <td class="number">${formatCurrency(info.rent)}/month</td>
            <td class="number">${formatCurrency(info.cost)}</td>
          </tr>
        `;
      });

      scenariosHTML += `
        <div class="scenario ${isExtreme ? 'extreme' : ''} ${isAuto ? 'auto' : ''}">
          <div class="scenario-header">${scenario.name}</div>
          <div class="scenario-details">
            <div class="detail-row">
              <span class="label">Duration:</span>
              <span class="value">${scenario.rental_period_years || 20} years</span>
            </div>
            <div class="detail-row">
              <span class="label">Total Units:</span>
              <span class="value">${summary.totalUnits}</span>
            </div>
            <div class="detail-row">
              <span class="label">Build Area:</span>
              <span class="value">${summary.totalBuildArea.toFixed(0)} m²</span>
            </div>
            <div class="detail-row">
              <span class="label">Total Investment:</span>
              <span class="value">${formatCurrency(summary.totalCosts)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total Revenue:</span>
              <span class="value">${formatCurrency(summary.totalRevenue)}</span>
            </div>
            <div class="detail-row ${summary.surplusPercent >= 0 ? 'positive' : 'negative'}">
              <span class="label">Surplus:</span>
              <span class="value">${summary.surplusPercent >= 0 ? '+' : ''}${summary.surplusPercent.toFixed(1)}% (${formatCurrency(summary.surplus)})</span>
            </div>
            <div class="detail-row">
              <span class="label">Break-even:</span>
              <span class="value">${formatBreakEven(summary.breakEvenMonths)}</span>
            </div>
          </div>
          ${Object.keys(summary.unitsByType).length > 0 ? `
            <div class="units-breakdown">
              <div class="breakdown-title">Units Breakdown</div>
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Area</th>
                    <th>Rent</th>
                    <th>Cost/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  ${unitsBreakdownHTML}
                </tbody>
              </table>
            </div>
          ` : ''}
          ${scenario.notes ? `
            <div class="scenario-notes">
              <div class="notes-title">Notes:</div>
              <div class="notes-content">${scenario.notes.replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}
        </div>
      `;
    });

    sitesHTML += `
      <div class="site-section">
        <div class="site-header">
          <h2>${site.name}</h2>
          ${site.area_ha ? `<span class="site-area">${site.area_ha.toFixed(2)} ha</span>` : ''}
        </div>
        
          <div class="blocks-section">
            <h3>Block Configurations</h3>
            <div class="blocks-grid">
              ${blocksHTML || '<p class="empty">No blocks configured</p>'}
            </div>
          </div>
        
        <div class="scenarios-section">
          <h3>Scenarios (${siteScenarios.length})</h3>
          ${scenariosHTML || '<p class="empty">No scenarios created</p>'}
        </div>
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Project Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #007AFF;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      color: #007AFF;
      margin-bottom: 8px;
    }
    .header .date {
      color: #666;
      font-size: 12px;
    }
    .project-summary {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .project-summary h2 {
      font-size: 16px;
      color: #333;
      margin-bottom: 10px;
    }
    .summary-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }
    .summary-item {
      flex: 1;
      min-width: 120px;
    }
    .summary-item .label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-item .value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .site-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .site-header {
      background: #007AFF;
      color: white;
      padding: 10px 15px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .site-header h2 {
      font-size: 16px;
    }
    .site-area {
      font-size: 14px;
      opacity: 0.9;
    }
    .blocks-section, .scenarios-section {
      background: white;
      border: 1px solid #e0e0e0;
      padding: 15px;
      margin-bottom: 15px;
    }
    .blocks-section h3, .scenarios-section h3 {
      font-size: 14px;
      color: #333;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #eee;
    }
    .blocks-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
    }
    .layouts-visuals {
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .layouts-visuals h3 {
      font-size: 14px;
      color: #333;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #eee;
    }
    .visuals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
    }
    .visual-item {
      background: white;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 10px;
      page-break-inside: avoid;
    }
    .visual-title {
      font-weight: 600;
      color: #007AFF;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .visual-image {
      width: 100%;
      height: 120px;
      object-fit: contain;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .visual-desc {
      font-size: 10px;
      color: #666;
    }
    .block-item {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 10px;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .block-header {
      font-weight: 600;
      color: #007AFF;
      margin-bottom: 8px;
      width: 100%;
      text-align: center;
    }
    .half-blocks-visual {
      display: flex;
      flex-direction: column;
      gap: 0;
      width: 100%;
      align-items: center;
    }
    .half-block-visual-item {
      position: relative;
      width: 100%;
      height: 100px;
      overflow: hidden;
      border: 1px solid #ddd;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .half-block-visual-item.north {
      border-radius: 4px 4px 0 0;
      border-bottom: none;
    }
    .half-block-visual-item.south {
      border-radius: 0 0 4px 4px;
      border-top: 1px dashed #ccc;
    }
    .hb-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .hb-image.rotated {
      transform: rotate(180deg);
    }
    .hb-placeholder {
      font-size: 9px;
      color: #999;
      text-align: center;
      padding: 5px;
    }
    .hb-label {
      position: absolute;
      background: rgba(255, 255, 255, 0.8);
      padding: 2px 4px;
      font-size: 8px;
      border-radius: 2px;
      z-index: 10;
    }
    .hb-label.north {
      top: 2px;
      left: 2px;
    }
    .hb-label.south {
      bottom: 2px;
      right: 2px;
    }
    .scenario {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .scenario.auto {
      background: #fff8f0;
      border-color: #ffd3a0;
    }
    .scenario.extreme {
      background: #fff0f0;
      border-color: #ffcdd2;
    }
    .scenario-header {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }
    .scenario.extreme .scenario-header {
      color: #dc3545;
    }
    .scenario.auto .scenario-header {
      color: #ff9500;
    }
    .scenario-details {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .detail-row {
      flex: 1;
      min-width: 140px;
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .detail-row.positive .value {
      color: #28a745;
    }
    .detail-row.negative .value {
      color: #dc3545;
    }
    .detail-row .label {
      color: #666;
    }
    .detail-row .value {
      font-weight: 600;
    }
    .units-breakdown {
      margin-top: 10px;
    }
    .breakdown-title {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .breakdown-table th, .breakdown-table td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .breakdown-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #666;
    }
    .breakdown-table .number {
      text-align: right;
    }
    .scenario-notes {
      margin-top: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .notes-title {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      margin-bottom: 4px;
    }
    .notes-content {
      font-size: 10px;
      color: #333;
      white-space: pre-wrap;
    }
    .empty {
      color: #999;
      font-style: italic;
      text-align: center;
      padding: 15px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 10px;
    }
    @page {
      margin: 15mm;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${project.name}</h1>
    ${project.description ? `<p>${project.description}</p>` : ''}
    <p class="date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="project-summary">
    <h2>Project Overview</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Total Sites</div>
        <div class="value">${sites.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Scenarios</div>
        <div class="value">${scenarios.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Max Rental Period</div>
        <div class="value">${project.max_rental_period_years || 20} years</div>
      </div>
      <div class="summary-item">
        <div class="label">Gold Price</div>
        <div class="value">${formatCurrency(data.goldPrice)}/g</div>
      </div>
    </div>
  </div>

  ${sitesHTML}

  <div class="footer">
    <p>ZURB Project Report - ${project.name}</p>
  </div>
</body>
</html>
  `;
}

export async function exportToPDF(data: ExportData): Promise<string | null> {
  try {
    console.log('[Export] Generating PDF...');
    const html = generatePDFHTML(data);
    
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
      return null;
    }
    
    const { uri } = await Print.printToFileAsync({ 
      html,
      width: 612,
      height: 792,
    });
    
    console.log('[Export] PDF generated at:', uri);
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${data.project.name} Report`,
      });
    }
    
    return uri;
  } catch (error) {
    console.error('[Export] Error generating PDF:', error);
    throw error;
  }
}

export function generateExcelWorkbook(data: ExportData): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  
  const summaryData = [
    ['Project Report', data.project.name],
    ['Description', data.project.description || ''],
    ['Generated', new Date().toLocaleDateString()],
    [''],
    ['Total Sites', data.sites.length],
    ['Total Scenarios', data.scenarios.length],
    ['Max Rental Period', `${data.project.max_rental_period_years || 20} years`],
    ['Gold Price', `${data.goldPrice} XOF/g`],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  data.sites.forEach(site => {
    const siteScenarios = data.scenarios.filter(s => s.site_id === site.id);
    
    if (siteScenarios.length === 0) return;
    
    siteScenarios.forEach(scenario => {
      const summary = calculateScenarioSummary(scenario, site, data);
      
      const scenarioData: (string | number)[][] = [
        ['Scenario', scenario.name],
        ['Site', site.name],
        ['Duration', `${scenario.rental_period_years || 20} years`],
        [''],
        ['FINANCIAL SUMMARY'],
        ['Total Units', summary.totalUnits],
        ['Build Area (m²)', summary.totalBuildArea],
        ['Total Investment (XOF)', summary.totalCosts],
        ['Total Revenue (XOF)', summary.totalRevenue],
        ['Surplus (XOF)', summary.surplus],
        ['Surplus (%)', `${summary.surplusPercent.toFixed(1)}%`],
        ['Break-even', formatBreakEven(summary.breakEvenMonths)],
        [''],
        ['UNITS BREAKDOWN'],
        ['Code', 'Type', 'Quantity', 'Area (m²)', 'Monthly Rent (XOF)', 'Cost per Unit (XOF)', 'Total Cost (XOF)', 'Total Rent (XOF)'],
      ];
      
      Object.entries(summary.unitsByType).forEach(([code, info]) => {
        const housingConfig = HOUSING_TYPES[code];
        const name = housingConfig?.name || code;
        const totalCost = info.cost * info.count;
        const totalRent = info.rent * 12 * (scenario.rental_period_years || 20) * info.count;
        scenarioData.push([
          code,
          name,
          info.count,
          info.area,
          info.rent,
          info.cost,
          totalCost,
          totalRent,
        ]);
      });
      
      if (scenario.notes) {
        scenarioData.push(['']);
        scenarioData.push(['NOTES']);
        scenarioData.push([scenario.notes]);
      }
      
      const sheetName = `${site.name.substring(0, 10)}-${scenario.name.substring(0, 15)}`.replace(/[\\/:*?[\]]/g, '_');
      const sheet = XLSX.utils.aoa_to_sheet(scenarioData);
      
      sheet['!cols'] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];
      
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName.substring(0, 31));
    });
  });
  
  return workbook;
}

export async function exportToExcel(data: ExportData): Promise<string | null> {
  try {
    console.log('[Export] Generating Excel...');
    const workbook = generateExcelWorkbook(data);
    
    if (Platform.OS === 'web') {
      XLSX.writeFile(workbook, `${data.project.name.replace(/[\\/:*?[\]]/g, '_')}_Report.xlsx`);
      return null;
    }
    
    const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const filename = `${data.project.name.replace(/[\\/:*?[\]]/g, '_')}_Report.xlsx`;
    const file = new File(Paths.cache, filename);
    file.write(new Uint8Array(wbout));
    const uri = file.uri;
    
    console.log('[Export] Excel generated at:', uri);
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `${data.project.name} Report`,
      });
    }
    
    return uri;
  } catch (error) {
    console.error('[Export] Error generating Excel:', error);
    throw error;
  }
}
