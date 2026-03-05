use reqwest::header;
use scraper::{Html, Selector};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TasaBCV {
    pub valor: f64,
    pub fecha: String,
}

pub async fn scrape_bcv() -> Result<TasaBCV, Box<dyn std::error::Error>> {
    let mut headers = header::HeaderMap::new();
    headers.insert(header::USER_AGENT, header::HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"));

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()?;

    let res = client.get("https://www.bcv.org.ve/").send().await?.text().await?;
    let document = Html::parse_document(&res);

    // Selector for the USD rate in BCV website
    // Usually it's inside a div with id 'dolar' or similar. 
    // Checking BCV structure: it's often inside #dolar strong
    let selector = Selector::parse("#dolar strong").unwrap();
    
    let valor_str = document
        .select(&selector)
        .next()
        .ok_or("No se encontró el valor del dólar en BCV")?
        .text()
        .collect::<String>()
        .trim()
        .replace(',', "."); // Replace comma with dot for parsing
    
    let valor: f64 = valor_str.parse()?;

    // Optional: Parse date too if available
    let date_selector = Selector::parse(".date-display-single").unwrap();
    let fecha = document
        .select(&date_selector)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string());

    Ok(TasaBCV { valor, fecha })
}
