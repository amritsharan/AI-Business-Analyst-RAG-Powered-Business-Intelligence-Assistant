import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_pdf(filename, title, pages_data):
    """
    pages_data is a list of pages. Each page is a list of elements:
    ('h1', text), ('h2', text), ('body', text), ('table', headers, rows)
    """
    doc = SimpleDocTemplate(filename, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1E293B'), # Slate 800
        spaceAfter=20
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=8
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#334155'), # Slate 700
        spaceAfter=10
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=20
    )

    story = []
    
    # Document title
    story.append(Paragraph(title, title_style))
    story.append(Paragraph("Confidential Internal Business Report — Generated August 2026", meta_style))
    story.append(Spacer(1, 15))
    
    for i, page in enumerate(pages_data):
        if i > 0:
            story.append(PageBreak())
            # For subsequent pages, add a small header
            story.append(Paragraph(f"{title} — Page {i + 1}", meta_style))
            story.append(Spacer(1, 10))
            
        for item in page:
            item_type = item[0]
            if item_type == 'h1':
                story.append(Paragraph(item[1], title_style))
            elif item_type == 'h2':
                story.append(Paragraph(item[1], h2_style))
            elif item_type == 'body':
                story.append(Paragraph(item[1], body_style))
            elif item_type == 'table':
                headers = item[1]
                rows = item[2]
                table_data = [headers] + rows
                
                # Make all table items Paragraphs to allow auto wrapping
                formatted_data = []
                for r_idx, row in enumerate(table_data):
                    formatted_row = []
                    for col in row:
                        style = h2_style if r_idx == 0 else body_style
                        formatted_row.append(Paragraph(str(col), style))
                    formatted_data.append(formatted_row)
                
                t = Table(formatted_data, colWidths=[120] * len(headers))
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(t)
                story.append(Spacer(1, 12))
            elif item_type == 'spacer':
                story.append(Spacer(1, item[1]))
                
    doc.build(story)
    print(f"Created report: {filename} with {len(pages_data)} pages.")

def main():
    os.makedirs('backend/data', exist_ok=True)
    
    # Report 1: Q1 Sales Report (2 pages)
    create_pdf(
        'backend/data/q1_sales_report.pdf',
        'Q1 Sales Report',
        [
            # Page 1
            [
                ('h2', 'Executive Summary'),
                ('body', 'This report provides a detailed analysis of sales performance and revenue generation during the first quarter (Q1) of the fiscal year. In Q1, the company achieved total sales revenue of $1.1M across all product lines, representing steady quarter-over-quarter growth. We successfully completed 10,200 sales transactions.'),
                ('h2', 'Q1 Regional Performance Breakdown'),
                ('body', 'Our sales are distributed across four main geographic regions: North, East, West, and South. The North region led in revenue contribution, followed closely by the East region.'),
                ('table', ['Region', 'Revenue', 'Sales Transactions'], [
                    ['North', '$350,000', '3,200'],
                    ['East', '$300,000', '2,800'],
                    ['West', '$250,000', '2,300'],
                    ['South', '$200,000', '1,900'],
                    ['Total', '$1,100,000', '10,200']
                ])
            ],
            # Page 2
            [
                ('h2', 'Product Category Sales Breakdown'),
                ('body', 'Sales performance varied across our three major product segments: Software Licenses, Hardware Sales, and Professional Services. Software Licenses continue to be the primary engine of growth, offering the highest margins.'),
                ('table', ['Product Category', 'Q1 Revenue', 'Percentage Share'], [
                    ['Software Licenses', '$600,000', '54.5%'],
                    ['Hardware Sales', '$300,000', '27.3%'],
                    ['Professional Services', '$200,000', '18.2%'],
                    ['Total', '$1,100,000', '100.0%']
                ]),
                ('body', 'Software license sales were driven by strong enterprise adoption of our cloud SaaS offering. Hardware sales remained stable, while Professional Services was consistent with onboarding and implementation schedules.')
            ]
        ]
    )

    # Report 2: Q2 Sales Report (2 pages)
    create_pdf(
        'backend/data/q2_sales_report.pdf',
        'Q2 Sales Report',
        [
            # Page 1
            [
                ('h2', 'Executive Summary'),
                ('body', 'This report covers sales operations and financial performance during the second quarter (Q2). Total revenue for Q2 reached $1.3M, representing an 18.2% increase compared to Q1. Combined sales transactions for Q2 were 14,620. Total H1 (First Half) revenue stands at $2.4M with 24,820 total sales transactions.'),
                ('h2', 'Q2 Regional Performance Breakdown'),
                ('body', 'Regional sales metrics indicated solid growth across most sectors. The North and East regions continue to demonstrate high performance, whereas the South region recorded slower growth rates.'),
                ('table', ['Region', 'Revenue', 'Sales Transactions'], [
                    ['North', '$400,000', '4,500'],
                    ['East', '$380,000', '4,280'],
                    ['West', '$300,000', '3,340'],
                    ['South', '$220,000', '2,500'],
                    ['Total', '$1,300,000', '14,620']
                ])
            ],
            # Page 2
            [
                ('h2', 'Product Category Sales Breakdown'),
                ('body', 'The Software Licenses segment expanded in Q2, contributing $750,000 in revenue. Hardware Sales also experienced a modest increase to $350,000, while Professional Services remained steady at $200,000.'),
                ('table', ['Product Category', 'Q2 Revenue', 'Percentage Share'], [
                    ['Software Licenses', '$750,000', '57.7%'],
                    ['Hardware Sales', '$350,000', '26.9%'],
                    ['Professional Services', '$200,000', '15.4%'],
                    ['Total', '$1,300,000', '100.0%']
                ]),
                ('body', 'The transition to cloud subscription models contributed to the high share of software revenue. High support costs in regional centers have had a minor impact on services profitability, particularly in the Southern region.')
            ]
        ]
    )

    # Report 3: Customer Churn Analysis (2 pages)
    create_pdf(
        'backend/data/customer_churn_analysis.pdf',
        'Customer Churn Analysis',
        [
            # Page 1
            [
                ('h2', 'H1 Customer Retention Overview'),
                ('body', 'This report provides a detailed breakdown of customer retention and churn trends for the first half of the year. Our overall churn rate across all regions was 11.7%, corresponding to a retention rate of 88.3%. This rate indicates that we must take active measures to secure customer renewals.'),
                ('body', 'Quarterly analysis indicates that the churn rate increased from 10.2% in Q1 to 13.2% in Q2, demonstrating an upward trend that requires immediate intervention.'),
                ('table', ['Metric', 'Q1 Value', 'Q2 Value', 'H1 Average'], [
                    ['Churn Rate', '10.2%', '13.2%', '11.7%'],
                    ['Retention Rate', '89.8%', '86.8%', '88.3%']
                ])
            ],
            # Page 2
            [
                ('h2', 'Regional Churn Performance'),
                ('body', 'A regional breakdown highlights significant variation in retention success. The North region maintained the lowest churn rate at 9.5%. In contrast, the South region recorded the highest churn rate in the company, reaching 14.2% in H1.'),
                ('table', ['Region', 'Churn Rate', 'Retention Rate'], [
                    ['North', '9.5%', '90.5%'],
                    ['East', '10.8%', '89.2%'],
                    ['West', '12.3%', '87.7%'],
                    ['South', '14.2%', '85.8%'],
                    ['Average', '11.7%', '88.3%']
                ]),
                ('h2', 'Primary Drivers of Customer Churn'),
                ('body', 'Exit surveys reveal three main factors driving customer departures. First, pricing concerns and subscription costs account for 40% of churned accounts. Second, slow onboarding and software implementation times represent 35% of departures. Third, delays in customer support resolutions constitute 25% of churn. Customer support issues are particularly prominent in the South region.')
            ]
        ]
    )

    # Report 4: Customer Support Report (2 pages)
    create_pdf(
        'backend/data/customer_support_report.pdf',
        'Customer Support Report',
        [
            # Page 1
            [
                ('h2', 'Support Ticket Volume and Categorization'),
                ('body', 'During the first half of the fiscal year (H1), the customer support division managed a total of 1,850 support tickets. High ticket volumes in Q2 led to backlog challenges. Tickets were classified into four main categories based on user queries.'),
                ('table', ['Category', 'Ticket Count', 'Percentage Share'], [
                    ['Technical Issues', '833', '45.0%'],
                    ['Billing Inquiries', '555', '30.0%'],
                    ['Feature Requests', '277', '15.0%'],
                    ['Account Setup & Admin', '185', '10.0%'],
                    ['Total', '1,850', '100.0%']
                ])
            ],
            # Page 2
            [
                ('h2', 'Support Quality Metrics'),
                ('body', 'Customer Satisfaction (CSAT) scores and average response times were tracked to evaluate support quality. Overall H1 CSAT was 82.5%. However, CSAT scores fell from 84.0% in Q1 to 81.0% in Q2 due to increased ticket queues. Average ticket response time rose from 4.2 hours in Q1 to 6.8 hours in Q2.'),
                ('table', ['Metric', 'Q1 Performance', 'Q2 Performance', 'H1 Average'], [
                    ['CSAT Score', '84.0%', '81.0%', '82.5%'],
                    ['Avg Response Time', '4.2 hours', '6.8 hours', '5.5 hours']
                ]),
                ('body', 'The increase in ticket response times was primarily driven by engineering resource constraints and complex technical issues. Technical tickets took an average of 9.2 hours to resolve, whereas billing inquiries were completed in 2.1 hours on average.')
            ]
        ]
    )

    # Report 5: Product Performance Report (2 pages)
    create_pdf(
        'backend/data/product_performance_report.pdf',
        'Product Performance Report',
        [
            # Page 1
            [
                ('h2', 'Software Segment Performance'),
                ('body', 'Software Licenses remain the company\'s flagship offering, generating $1,350,000 in revenue across H1 (Q1: $600,000, Q2: $750,000). The Software segment recorded a customer satisfaction (CSAT) rating of 88.0%, showing strong product-market fit.'),
                ('body', 'Growth was fueled by new seat expansion in key enterprise accounts and the release of new AI-powered analytics modules in Q2. Net Revenue Retention (NRR) for software reached 112% in H1.')
            ],
            # Page 2
            [
                ('h2', 'Hardware and Professional Services Segments'),
                ('body', 'Hardware Sales brought in $650,000 in revenue in H1, with Q1 at $300,000 and Q2 at $350,000. CSAT for hardware was lower at 78.0%, reflecting supply chain delays. Professional Services generated $400,000 in H1 (Q1: $200,000, Q2: $200,000) with a CSAT rating of 82.0%.'),
                ('table', ['Segment', 'H1 Revenue', 'CSAT Rating', 'Key Metric'], [
                    ['Software Licenses', '$1,350,000', '88.0%', '112% NRR'],
                    ['Hardware Sales', '$650,000', '78.0%', '14-day Lead Time'],
                    ['Professional Services', '$400,000', '82.0%', '92% Project Success']
                ]),
                ('body', 'To improve the Hardware CSAT score, we are onboarding new logistics partners in the West and South. Professional services CSAT can be optimized by automating standard migration templates, which currently take up 40% of implementation hours.')
            ]
        ]
    )

    # Report 6: Regional Performance Report (2 pages)
    create_pdf(
        'backend/data/regional_performance_report.pdf',
        'Regional Performance Report',
        [
            # Page 1
            [
                ('h2', 'High-Performing Regions: North and East'),
                ('body', 'The North and East regions represent our top markets, accounting for a combined 59.6% of total revenue. The North region led the company with $750,000 in H1 revenue, achieving a 9.5% churn rate and the highest regional CSAT score of 86.0%.'),
                ('body', 'The East region delivered $680,000 in revenue, with a churn rate of 10.8% and a CSAT score of 83.0%, driven by heavy expansion in financial services accounts.')
            ],
            # Page 2
            [
                ('h2', 'West and South Regional Performance'),
                ('body', 'The West region contributed $550,000 in revenue, reporting a 12.3% churn rate and an 80.0% CSAT score. The South region continues to be our lowest-performing area, contributing $420,000 in revenue, with a high churn rate of 14.2% and a CSAT score of 75.0%.'),
                ('table', ['Region', 'H1 Revenue', 'Churn Rate', 'CSAT Score'], [
                    ['North', '$750,000', '9.5%', '86.0%'],
                    ['East', '$680,000', '10.8%', '83.0%'],
                    ['West', '$550,000', '12.3%', '80.0%'],
                    ['South', '$420,000', '14.2%', '75.0%'],
                    ['Total / Avg', '$2,400,000', '11.7%', '81.0%']
                ]),
                ('h2', 'Operational Issues in the South Region'),
                ('body', 'A detailed audit of the South region indicates that operational issues are directly linked to high customer churn. Our database servers in the South region experienced periodic latency spikes of up to 450ms, causing delays in software performance. This latency triggered a 50% increase in support tickets and contributed to the high churn rate of 14.2% in the region.')
            ]
        ]
    )

if __name__ == '__main__':
    main()
