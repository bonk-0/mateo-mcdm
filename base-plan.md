# FUZZY DECISION STUDIO (MATEO)
## Complete Product, UI/UX and System Design Report

**Product Type:** Professional Web-Based MCDM Platform  
**Platform:** Web Application  
**Target Users:** Academics, Researchers, Engineers, Decision Analysts and Students

---

# 1. PRODUCT VISION

Mateo is a comprehensive professional platform that integrates classical and fuzzy Multi-Criteria Decision Making (MCDM) methods into a single environment.

The platform enables users to create decision models, import data from Excel and CSV files, apply different MCDM methods, perform comparative analyses, visualize mathematical calculations, and generate professional academic reports.

The application is designed for both professional and academic use. It must provide reliable mathematical calculations while making complex methodologies understandable through integrated animations and visual explanations.

MARCOS and Fuzzy MARCOS will be the central methods of the platform. All other methods will be integrated into the same data management and calculation ecosystem.

## 1.1. Core Principles

- Professional-grade mathematical calculations.
- Easy and fast user experience.
- Minimum manual data entry.
- Comprehensive Excel and CSV compatibility.
- Automated data recognition and validation.
- Classical and fuzzy calculation support.
- Modular MCDM method architecture.
- Integrated animated calculation and education system.
- Hybrid MCDM model construction.
- Method comparison and sensitivity analysis.
- Professional reporting and data export.
- Reproducible calculations and project versioning.

## 1.2. Product Philosophy

**Professional enough for researchers.**

**Powerful enough for decision analysts.**

**Accessible enough for everyone.**

---

# 2. TARGET USERS

| User Group | Primary Needs |
|---|---|
| Academics | Scientific calculations, verification and reporting |
| Researchers | Hybrid models and methodological comparisons |
| Engineers | Technical evaluation and decision support |
| Professionals | Fast analysis and alternative ranking |
| Risk Analysts | Risk evaluation and prioritization |
| Students | Methodological learning and practical exercises |
| Educators | Visual explanations and interactive teaching |

The platform must support all user groups through a unified interface.

Professional analysis must remain the primary workflow, while animated learning and educational explanations must be integrated into every calculation method.

---

# 3. APPLICATION INFORMATION ARCHITECTURE

The application will consist of the following main modules:

1. Dashboard
2. Workspace
3. Project Management
4. Data Center
5. Decision Matrix Editor
6. Weighting Methods
7. Ranking Methods
8. DEMATEL Analysis
9. Risk Assessment
10. Hybrid MCDM Builder
11. MARCOS Workspace
12. Results & Analytics
13. Sensitivity Analysis
14. Method Comparison
15. Group Decision Making
16. Reports & Export
17. Learning Center
18. Method Library
19. User Management & Settings

Each module must share the same project, data and calculation infrastructure.

---

# 4. DASHBOARD

The Dashboard is the main landing page after authentication.

It provides an overview of the user's projects, datasets, calculations and reports.

## 4.1. Dashboard Components

- Total Projects
- Completed Analyses
- Available Datasets
- Generated Reports
- Recent Projects
- Recent Calculations
- Recently Used Methods
- Quick Analysis
- Quick Data Import
- Recent Activities

## 4.2. Quick Actions

The user should be able to:

- Create a new project.
- Upload an Excel or CSV file.
- Start a MARCOS analysis.
- Open an existing project.
- Continue a previous analysis.
- Access recently used methods.

The dashboard must prioritize productivity and quick access.

---

# 5. WORKSPACE & PROJECT MANAGEMENT

The Workspace is the central working environment of the application.

Users must be able to manage projects, datasets, analyses and reports in an organized structure.

## 5.1. Project Management

- Create projects.
- Edit project information.
- Delete projects.
- Duplicate projects.
- Archive projects.
- Categorize projects.
- Add project descriptions.
- Manage project datasets.
- Manage multiple analyses within one project.
- View analysis history.
- Export project data.
- Share projects where permissions allow.

## 5.2. Project Structure

Each project must contain:

- Project Information
- Alternatives
- Criteria
- Decision Matrices
- Fuzzy Scales
- Expert Evaluations
- Weighting Results
- Ranking Analyses
- Sensitivity Scenarios
- Comparison Results
- Reports
- Calculation History

## 5.3. Project Versioning

The system must preserve previous project states.

Users must be able to:

- View previous versions.
- Compare versions.
- Restore earlier versions.
- Track data changes.
- Track method configuration changes.
- Reproduce previous calculations.

---

# 6. DATA CENTER

The Data Center is one of the most important modules of the platform.

Excel and CSV compatibility must be a fundamental part of the application architecture rather than an additional feature.

The objective is to allow users to work with existing research datasets without manually rebuilding their data.

## 6.1. Supported File Formats

| Format | Import | Export |
|---|---|---|
| XLSX | Yes | Yes |
| XLS | Yes | XLSX |
| XLSM | Data import | XLSX |
| CSV | Yes | Yes |
| TSV | Yes | Yes |

The application should preserve MCDM-related data structures during import and export.

CSV does not support worksheets, formatting or formulas. Therefore, multi-table CSV exports must be provided as separate files or as ZIP archives.

Macro execution is not required for XLSM files.

## 6.2. Automatic Data Recognition

The application must automatically detect:

- Worksheet names.
- Header rows.
- Data ranges.
- Alternative identifiers.
- Criterion identifiers.
- Numerical columns.
- Textual columns.
- Criterion directions.
- Fuzzy number components.
- Linguistic evaluations.
- Expert identifiers.
- Missing values.
- Duplicate records.
- Inconsistent data structures.

The user should be able to review the detected structure before importing it.

## 6.3. Supported Data Structures

- Classical Decision Matrix.
- Triangular Fuzzy Decision Matrix.
- Trapezoidal Fuzzy Decision Matrix.
- Linguistic Decision Matrix.
- Group Decision Matrix.
- Expert-Based Decision Data.
- Long-Format Decision Data.
- Wide-Format Decision Data.
- Criteria Weight Tables.
- DEMATEL Relation Matrices.
- FMEA Risk Tables.
- Fine-Kinney Risk Tables.

## 6.4. Excel Import Wizard

The Excel Import Wizard must provide:

1. File upload.
2. Worksheet selection.
3. Automatic structure detection.
4. Column mapping.
5. Data type recognition.
6. Missing value detection.
7. Data validation.
8. Preview.
9. Import confirmation.

Users must be able to save their import configurations as reusable Import Profiles.

## 6.5. Data Validation

The system must detect:

- Missing values.
- Invalid numerical values.
- Incorrect fuzzy number ordering.
- Inconsistent identifiers.
- Duplicate alternatives.
- Duplicate criteria.
- Invalid criterion directions.
- Incompatible data types.
- Incorrect matrix dimensions.

Errors and warnings must be clearly distinguished.

The system must never silently replace missing or invalid research data with invented values.

## 6.6. Locale and Number Formatting

The application must support:

- Turkish characters.
- UTF-8 encoding.
- Decimal comma.
- Decimal point.
- Different thousands separators.
- Comma-delimited CSV.
- Semicolon-delimited CSV.
- Tab-delimited files.
- Date and numerical format recognition.

Examples such as `1.234,56` and `1,234.56` must be interpreted according to the selected or detected locale.

## 6.7. Data Integrity

- Preserve original uploaded files.
- Preserve numerical precision.
- Preserve identifiers.
- Preserve supported data types.
- Prevent unintended data modification.
- Validate imported and exported datasets.
- Provide import/export history.
- Support round-trip data integrity tests.

---

# 7. DECISION MATRIX EDITOR

The Decision Matrix Editor is a professional spreadsheet-like interface.

Users must be able to work with decision matrices directly inside the application.

## 7.1. Editing Features

- Cell editing.
- Multi-cell selection.
- Copy and paste.
- Direct Excel paste.
- Row insertion.
- Row deletion.
- Column insertion.
- Column deletion.
- Drag and drop.
- Filtering.
- Sorting.
- Undo and redo.
- Automatic saving.
- Bulk editing.
- Data validation.
- Search.
- Freeze rows and columns.

## 7.2. Criterion Management

Each criterion must support:

- Criterion Name
- Criterion ID
- Description
- Benefit / Cost Direction
- Measurement Unit
- Data Type
- Fuzzy Type
- Linguistic Scale
- Criterion Weight
- Weighting Method

## 7.3. Alternative Management

Each alternative must support:

- Alternative ID
- Alternative Name
- Description
- Evaluation Data
- Performance Values
- Group Identification

The editor must support both classical and fuzzy decision matrices.

---

# 8. FUZZY CALCULATION ENGINE

The Fuzzy Calculation Engine is the shared mathematical infrastructure for all fuzzy methods.

It must provide reusable fuzzy number operations while preserving the mathematical requirements of individual methodologies.

## 8.1. Supported Fuzzy Models

- Triangular Fuzzy Numbers (TFN)
- Trapezoidal Fuzzy Numbers
- Intuitionistic Fuzzy Sets
- Interval Type-2 Fuzzy Sets
- Neutrosophic Sets

The implementation and availability of each fuzzy model must be defined individually for every method.

## 8.2. Core Mathematical Functions

- Fuzzy number operations.
- Fuzzy arithmetic.
- Addition.
- Subtraction.
- Multiplication.
- Division.
- Aggregation.
- Normalization.
- Defuzzification.
- Ranking of fuzzy numbers.
- Linguistic variable conversion.
- Membership function visualization.

## 8.3. Linguistic Scale Management

Users must be able to:

- Select predefined linguistic scales.
- Create custom linguistic scales.
- Edit fuzzy number parameters.
- Save linguistic scale templates.
- Reuse scales across projects.
- Visualize membership functions.

Predefined scales must include common linguistic categories such as:

- Very Low
- Low
- Medium
- High
- Very High

The application must not assume that every method uses the same fuzzy scale or defuzzification procedure.

---

# 9. WEIGHTING METHODS

All weighting methods must be available as independent modules.

## 9.1. Supported Methods

| Method | Category |
|---|---|
| CRITIC | Objective Weighting |
| MEREC | Objective Weighting |
| LOPCOW | Objective Weighting |
| FUCOM | Subjective Weighting |
| SWARA | Subjective Weighting |
| BWM | Subjective Weighting |
| DEMATEL | Relationship and Influence Analysis |

## 9.2. General Features

- Classical calculation.
- Supported fuzzy variants.
- Automatic data import.
- Manual expert input.
- Intermediate calculation display.
- Final weight calculation.
- Weight visualization.
- Excel export.
- CSV export.
- Method comparison.
- Transfer of weights to ranking methods.

The user must be able to use the calculated weights directly in MARCOS and other compatible ranking methods.

---

# 10. DEMATEL ANALYSIS

DEMATEL will have an independent analysis workspace.

## 10.1. Features

- Direct Relation Matrix.
- Normalized Direct Relation Matrix.
- Total Relation Matrix.
- Prominence Analysis.
- Relation Analysis.
- Cause-Effect Diagram.
- Network Visualization.
- Classical DEMATEL.
- Fuzzy DEMATEL.
- Supported fuzzy DEMATEL extensions.
- Exportable matrices and diagrams.
- Animated calculation steps.

---

# 11. RANKING METHODS

The Ranking Methods module will include all specified alternative ranking algorithms.

## 11.1. Supported Methods

| Method | Supported Models |
|---|---|
| MARCOS | Classical and Fuzzy |
| VIKOR | Classical and Supported Fuzzy Variants |
| EDAS | Classical and Supported Fuzzy Variants |
| CODAS | Classical and Supported Fuzzy Variants |
| WASPAS | Classical and Supported Fuzzy Variants |
| COPRAS | Classical and Supported Fuzzy Variants |
| MOORA | Classical and Supported Fuzzy Variants |
| ARAS | Classical and Supported Fuzzy Variants |

Each method must have its own mathematical implementation and configuration.

## 11.2. General Features

- Common dataset usage.
- Automatic weighting method integration.
- Manual weight input.
- Alternative management.
- Criterion management.
- Intermediate calculation tables.
- Final rankings.
- Visual result presentation.
- Excel export.
- CSV export.
- Calculation history.
- Animated calculation explanations.

Fuzzy extensions must be implemented according to their corresponding mathematical definitions and validated literature formulations.

---

# 12. MARCOS WORKSPACE

MARCOS is the central and most developed module of the platform.

It must have a dedicated workspace with complete calculation visibility, professional analysis tools and integrated animations.

## 12.1. Supported Models

- Classical MARCOS.
- Fuzzy MARCOS.
- TFN-Based Fuzzy MARCOS.
- Supported Trapezoidal Fuzzy MARCOS extensions.
- Other validated MARCOS extensions.

## 12.2. Main Features

- Excel and CSV data import.
- Automatic matrix recognition.
- Manual matrix editing.
- Benefit and Cost criterion management.
- Manual criterion weights.
- Integration with weighting methods.
- Automatic matrix generation.
- Intermediate calculation tables.
- Mathematical formulas.
- Numerical calculation details.
- Final utility functions.
- Final alternative ranking.
- Sensitivity analysis.
- Result comparison.
- Excel and CSV export.
- Academic report generation.
- Animated calculation workspace.

## 12.3. MARCOS Workspace Layout

The MARCOS workspace should include:

1. Project Overview
2. Input Data
3. Criteria Configuration
4. Alternative Management
5. Weighting Configuration
6. Fuzzy Model Configuration
7. Calculation Workspace
8. Intermediate Results
9. Final Ranking
10. Sensitivity Analysis
11. Animated Explanation
12. Export & Reports

MARCOS must have a more comprehensive workspace than the other ranking methods.

---

# 13. HYBRID MCDM BUILDER

The Hybrid MCDM Builder allows users to combine compatible weighting and ranking methods.

## 13.1. Example Combinations

- FUCOM + MARCOS.
- CRITIC + MARCOS.
- MEREC + MARCOS.
- LOPCOW + MARCOS.
- SWARA + MARCOS.
- BWM + MARCOS.
- DEMATEL + MARCOS.
- CRITIC + VIKOR.
- FUCOM + EDAS.

## 13.2. Features

- Visual method selection.
- Weighting method selection.
- Ranking method selection.
- Fuzzy model selection.
- Shared dataset usage.
- Automatic weight transfer.
- Method compatibility validation.
- Visual workflow.
- Calculation history.
- Hybrid model saving.
- Result comparison.
- Animated workflow explanation.

The application must prevent mathematically incompatible combinations.

---

# 14. RISK ASSESSMENT

Risk Assessment will be a separate module.

## 14.1. FMEA

Features:

- Failure Mode Management.
- Severity.
- Occurrence.
- Detection.
- RPN Calculation.
- Risk Ranking.
- Risk Priority Table.
- Risk Visualization.
- Classical FMEA.
- Supported Fuzzy FMEA variants.
- Animated risk calculation.

## 14.2. Fine-Kinney

Features:

- Probability.
- Exposure.
- Consequence.
- Risk Score.
- Risk Classification.
- Risk Priority.
- Risk Visualization.
- Risk Reports.
- Classical Fine-Kinney.
- Supported fuzzy extensions.
- Animated calculation explanations.

Risk evaluation must remain separate from standard alternative ranking while allowing compatible outputs to be used in broader decision models.

---

# 15. GROUP DECISION MAKING

The Group Decision Making module allows multiple experts to evaluate the same decision problem.

## 15.1. Features

- Expert Management.
- Expert Identification.
- Expert Weighting.
- Individual Decision Matrices.
- Group Decision Matrix.
- Fuzzy Aggregation.
- Linguistic Evaluations.
- Expert Comparison.
- Group Results.
- Individual Results.
- Excel Import.
- Multiple Worksheet Recognition.
- Exportable Group Results.
- Animated aggregation explanations.

Expert evaluations must be importable from separate Excel worksheets or structured CSV datasets.

---

# 16. RESULTS & ANALYTICS

The Results module presents all analysis outcomes in a professional interface.

## 16.1. Main Sections

- Results Overview.
- Final Ranking.
- Criterion Weights.
- Alternative Performance.
- Calculation Details.
- Intermediate Results.
- Utility Functions.
- Charts.
- Ranking Comparison.
- Sensitivity Analysis.

## 16.2. Visualization Types

- Horizontal Bar Chart.
- Ranking Chart.
- Radar Chart.
- Heatmap.
- Weight Distribution.
- Criterion Contribution.
- Method Comparison Chart.
- DEMATEL Cause-Effect Diagram.
- Fuzzy Membership Function.
- Risk Matrix.

Charts must support interactive tooltips, data selection, export and clear numerical labels.

---

# 17. SENSITIVITY ANALYSIS

Sensitivity Analysis must be available for compatible ranking methods.

## 17.1. Features

- Criterion weight adjustment.
- Weight scenarios.
- Automatic recalculation.
- Ranking stability.
- Critical weight analysis.
- Scenario comparison.
- Alternative ranking changes.
- Visual comparison.
- Exportable results.

Users must be able to create multiple weight scenarios and compare their effects on the final rankings.

All modified weights must be validated and normalized according to the selected analysis procedure.

---

# 18. METHOD COMPARISON

Method Comparison allows users to evaluate the results of different ranking methods using the same dataset.

## 18.1. Features

- Shared decision matrix.
- Multiple method execution.
- Ranking comparison table.
- Spearman Rank Correlation.
- Kendall's Tau.
- Ranking Agreement.
- Rank Reversal Analysis.
- Ranking Stability.
- Visual Comparison.
- Exportable Comparison Reports.

The interface must clearly distinguish ranking similarity from mathematical correctness.

---

# 19. BATCH ANALYSIS

Users must be able to execute multiple compatible analysis scenarios using the same dataset.

## 19.1. Features

- Multiple weighting methods.
- Multiple ranking methods.
- Multiple fuzzy configurations.
- Scenario selection.
- Batch execution.
- Execution status.
- Progress tracking.
- Error reporting.
- Result comparison.
- Batch export.

Example scenarios:

- CRITIC + MARCOS.
- FUCOM + MARCOS.
- MEREC + MARCOS.
- LOPCOW + MARCOS.
- SWARA + MARCOS.
- FUCOM + VIKOR.

---

# 20. REPORTS & EXPORT

The reporting system must support professional and academic reporting.

## 20.1. Supported Formats

- XLSX.
- CSV.
- PDF.
- DOCX.

## 20.2. Excel Reports

The Excel reporting module should generate structured workbooks containing relevant worksheets such as:

- Project Information.
- Original Data.
- Alternatives.
- Criteria.
- Fuzzy Scales.
- Criteria Weights.
- Initial Matrix.
- Extended Matrix.
- Normalized Matrix.
- Weighted Matrix.
- Intermediate Calculations.
- Final Results.
- Sensitivity Analysis.
- Method Parameters.

The exact sheets must depend on the selected method.

## 20.3. Report Features

- Automatic report generation.
- Mathematical formulas.
- Calculation tables.
- Charts.
- Method descriptions.
- Parameter information.
- Project information.
- Bibliographic references.
- Calculation date.
- Algorithm version.
- Result interpretation.

Reports must be generated from actual calculation results.

Scientific references and methodological descriptions must be verified rather than invented.

---

# 21. ANIMATED LEARNING & VISUAL CALCULATION ENGINE

Animated learning is a mandatory and integral component of Fuzzy Decision Studio.

It is not an optional add-on or an independent educational product.

Every calculation method must have an animated mathematical explanation system integrated into its workspace.

The platform must be both a professional calculation tool and a visual mathematical learning environment.

## 21.1. Animated Calculation Engine

The calculation engine must provide structured intermediate outputs that can be consumed by the visualization system.

Every calculation step should include:

- Step Name.
- Input Data.
- Mathematical Operation.
- Formula.
- Numerical Calculation.
- Output.
- Explanation.
- Visualization Data.

Animations must be generated from actual calculation results.

The visual representation must never use invented or independently calculated values.

## 21.2. Animation Controls

The user must be able to:

- Play.
- Pause.
- Resume.
- Previous Step.
- Next Step.
- Replay.
- Change Playback Speed.
- Show Formula.
- Hide Formula.
- Show Numerical Calculation.
- Show Explanation.
- Select a Calculation Step.

## 21.3. Animated Learning for All Methods

| Method | Animated Content |
|---|---|
| DEMATEL | Relation matrices and cause-effect relationships |
| SWARA | Criterion importance and weighting |
| CRITIC | Standard deviation and correlation calculations |
| MEREC | Criterion removal and impact calculations |
| FUCOM | Comparative priorities and consistency |
| LOPCOW | Percentage variation and weighting calculations |
| BWM | Best-Worst comparisons |
| MARCOS | Extended matrix, normalization, utilities and ranking |
| VIKOR | Distance calculations and compromise solution |
| EDAS | Positive and negative distances |
| CODAS | Distance measurements and ranking |
| WASPAS | Weighted sum and product calculations |
| COPRAS | Benefit and cost assessments |
| MOORA | Ratio system and reference point |
| ARAS | Normalization and utility degrees |
| FMEA | Risk components and priority calculations |
| Fine-Kinney | Probability, exposure and consequence calculations |

Each method must have its own method-specific animation sequence.

## 21.4. Fuzzy Number Visualization

The application must visually explain fuzzy mathematics.

Supported visualizations:

- Triangular Fuzzy Number Graphs.
- Trapezoidal Fuzzy Number Graphs.
- Membership Functions.
- Linguistic Variable Visualization.
- Fuzzy Arithmetic.
- Fuzzy Aggregation.
- Defuzzification.
- Fuzzy Ranking.

Users must be able to modify fuzzy number parameters and observe the corresponding graphical changes.

## 21.5. MARCOS Animated Workspace

MARCOS must have the most comprehensive animated calculation experience.

Its animation sequence must cover:

1. Initial Decision Matrix.
2. Extended Decision Matrix.
3. Ideal Solution.
4. Anti-Ideal Solution.
5. Normalization.
6. Weighted Normalized Matrix.
7. Utility Degrees.
8. Utility Functions.
9. Final Ranking.

Every step must show the mathematical formula, actual numerical operation and resulting values.

The user must be able to inspect individual matrix cells and understand how each value was calculated.

## 21.6. Professional and Educational Integration

Animated explanations must be available within the normal professional calculation workflow.

Users must be able to view the final results immediately while also having access to the complete animated calculation sequence.

The animation system must not force users to manually perform calculations.

Instead, it must visualize calculations performed by the mathematical engine.

---

# 22. METHOD LIBRARY

Every method must have a dedicated reference page.

## 22.1. Method Page Structure

- Method Introduction.
- Purpose.
- Mathematical Background.
- Required Inputs.
- Supported Data Types.
- Supported Fuzzy Models.
- Calculation Steps.
- Mathematical Formulas.
- Animated Example.
- Sample Dataset.
- Scientific References.
- Related Methods.

The Method Library must be linked directly to the relevant calculation workspaces.

---

# 23. CALCULATION AUDIT & REPRODUCIBILITY

Academic and professional reliability requires every calculation to be traceable.

Each analysis must preserve:

- Original Dataset.
- Selected Method.
- Method Variant.
- Algorithm Version.
- Fuzzy Number Type.
- Normalization Approach.
- Defuzzification Method.
- Weighting Method.
- Calculation Parameters.
- Intermediate Results.
- Final Results.
- Calculation Timestamp.

The system must support the reproduction of previous analyses.

The same input data, mathematical formulation and parameters must produce the same results within the defined numerical precision.

---

# 24. USER INTERFACE & DESIGN SYSTEM

The interface must look and feel like a professional scientific analysis application.

## 24.1. Visual Identity

- Modern and minimalist design.
- White and light-gray backgrounds.
- Navy and blue accent colors.
- Consistent typography.
- Simple and recognizable icons.
- Professional data tables.
- Clear charts.
- Consistent spacing.
- Subtle transitions.
- Desktop-first responsive layout.

## 24.2. User Experience Principles

- Minimum interaction steps.
- Automatic data recognition.
- Easy project management.
- Spreadsheet-like editing.
- Fast calculation workflows.
- Clear error messages.
- Automatic saving.
- Consistent navigation.
- Accessible interface.
- Integrated animated explanations.

## 24.3. Main Navigation

The sidebar should have the following structure:

    FUZZY DECISION STUDIO

    WORKSPACE
        Dashboard
        My Projects
        Data Center

    METHODS
        Weighting Methods
        Ranking Methods
        DEMATEL
        Risk Assessment
        Hybrid MCDM Builder

    ANALYSIS
        MARCOS Workspace
        Results
        Sensitivity Analysis
        Method Comparison
        Group Decision Making
        Batch Analysis

    REPORTS
        Reports
        Export History

    LEARNING
        Method Library
        Learning Studio
        Practice Center

    SETTINGS
        Profile
        Preferences
        Data Management
        System Settings

---

# 25. TECHNICAL ARCHITECTURE

The application must use a modular architecture that separates the frontend, backend, data processing, mathematical calculations, visualization and reporting.

## 25.1. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| UI Framework | React |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Spreadsheet | AG Grid or Univer |
| Backend | Python + FastAPI |
| Numerical Computing | NumPy + SciPy |
| Data Processing | Pandas |
| Excel Processing | openpyxl |
| Database | PostgreSQL |
| Visualization | Apache ECharts |
| Background Jobs | Celery + Redis |
| File Storage | S3-Compatible Storage |

## 25.2. System Architecture

    FUZZY DECISION STUDIO
    |
    |-- FRONTEND
    |   |-- Dashboard
    |   |-- Workspace
    |   |-- Data Center
    |   |-- Matrix Editor
    |   |-- Method Interfaces
    |   |-- MARCOS Workspace
    |   |-- Results
    |   |-- Reports
    |   |-- Learning Center
    |
    |-- BACKEND
    |   |-- Authentication
    |   |-- Project Management
    |   |-- Data Management
    |   |-- File Processing
    |   |-- Analysis API
    |   |-- Report API
    |
    |-- CALCULATION ENGINE
    |   |-- Fuzzy Numbers
    |   |-- Arithmetic
    |   |-- Aggregation
    |   |-- Normalization
    |   |-- Defuzzification
    |   |-- Weighting Methods
    |   |-- Ranking Methods
    |   |-- DEMATEL
    |   |-- Risk Methods
    |
    |-- VISUALIZATION ENGINE
    |   |-- Animated Calculation
    |   |-- Mathematical Explanations
    |   |-- Matrix Transformations
    |   |-- Fuzzy Number Visualization
    |   |-- Interactive Charts
    |
    |-- ANALYSIS ENGINE
    |   |-- Sensitivity Analysis
    |   |-- Method Comparison
    |   |-- Group Decision Making
    |   |-- Batch Analysis
    |
    |-- REPORT ENGINE
    |   |-- Excel
    |   |-- CSV
    |   |-- PDF
    |   |-- DOCX
    |
    |-- DATABASE & STORAGE
        |-- PostgreSQL
        |-- File Storage
        |-- Project Versions
        |-- Calculation Records
        |-- Audit Logs

---

# 26. GENERAL SYSTEM REQUIREMENTS

All modules must share the same data infrastructure and calculation standards.

- A dataset must be reusable across multiple methods.
- A project must support multiple analyses.
- An analysis must support multiple scenarios.
- Weighting results must be transferable to compatible ranking methods.
- Previous analyses must be reproducible.
- Calculation outputs must be stored.
- Original uploaded files must be preserved.
- Excel and CSV data integrity must be validated.
- Large datasets must be handled efficiently.
- Long calculations must run as background tasks.
- Users must be able to monitor calculation progress.
- Calculation tasks must support cancellation and retry.
- Every method must be tested against validated reference examples.
- Unsupported method combinations must be prevented.
- Every method must have an animated calculation explanation.
- Animation data must be synchronized with actual mathematical outputs.

---

# 27. SECURITY AND DATA MANAGEMENT

The application must provide secure project and file management.

## Security Requirements

- Secure authentication.
- Role-based access control.
- Project-level permissions.
- Protected file storage.
- Data validation.
- API authorization.
- Secure session management.
- Audit logging.
- Database backups.
- User data separation.

Uploaded files must be validated before processing.

The application must not execute uploaded macros or arbitrary spreadsheet scripts.

---

# 28. COMPLETE APPLICATION SCOPE

The following components constitute the complete target product.

| Module | Required |
|---|---|
| Dashboard | Yes |
| Project Management | Yes |
| Data Center | Yes |
| Excel Import/Export | Yes |
| CSV Import/Export | Yes |
| Decision Matrix Editor | Yes |
| Fuzzy Calculation Engine | Yes |
| CRITIC | Yes |
| MEREC | Yes |
| FUCOM | Yes |
| SWARA | Yes |
| LOPCOW | Yes |
| BWM | Yes |
| DEMATEL | Yes |
| MARCOS | Yes |
| Fuzzy MARCOS | Yes |
| VIKOR | Yes |
| EDAS | Yes |
| CODAS | Yes |
| WASPAS | Yes |
| COPRAS | Yes |
| MOORA | Yes |
| ARAS | Yes |
| FMEA | Yes |
| Fine-Kinney | Yes |
| Hybrid MCDM Builder | Yes |
| Group Decision Making | Yes |
| Batch Analysis | Yes |
| Sensitivity Analysis | Yes |
| Method Comparison | Yes |
| Results & Analytics | Yes |
| Academic Reporting | Yes |
| Calculation Audit | Yes |
| Project Versioning | Yes |
| Animated Learning | Yes |
| Method Library | Yes |
| Fuzzy Number Visualization | Yes |

---

# 29. FINAL PRODUCT DEFINITION

Fuzzy Decision Studio is a comprehensive professional platform for classical and fuzzy multi-criteria decision making.

MARCOS and Fuzzy MARCOS are the central methods of the application, supported by a complete ecosystem of weighting, ranking, relationship analysis and risk assessment methods.

The platform combines:

- Professional mathematical calculations.
- Comprehensive Excel and CSV integration.
- Automated data management.
- Classical and fuzzy MCDM methods.
- Hybrid decision-making models.
- Group decision-making.
- Sensitivity analysis.
- Method comparison.
- Batch analysis.
- Academic reporting.
- Calculation reproducibility.
- Project and dataset management.
- Mandatory animated mathematical explanations.
- Interactive fuzzy number visualization.
- Integrated educational experiences.

The application must not be limited to a collection of independent calculators.

It must function as a unified professional decision analysis environment where users can import data, construct models, execute calculations, inspect mathematical operations, compare results, learn methodologies and produce research-ready outputs.

## PRODUCT PRINCIPLE

**Professional enough for researchers.**

**Powerful enough for decision analysts.**

**Visual enough to explain every calculation.**

**Accessible enough for everyone.**
