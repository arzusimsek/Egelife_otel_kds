const fs = require('fs');
const path = require('path');

/**
 * HTML template dosyasını okuyup, verileri yerleştirir
 * @param {string} templateName - Template dosya adı (uzantı olmadan)
 * @param {object} data - Template'e gönderilecek veriler
 * @returns {string} - Render edilmiş HTML
 */
function renderHTML(templateName, data = {}) {
    const templatePath = path.join(__dirname, '../views', `${templateName}.html`);
    
    try {
        let html = fs.readFileSync(templatePath, 'utf8');
        
        // Helper function: Placeholder replacement (nested property desteği ile)
        function replacePlaceholders(content, context) {
            // Önce nested property'leri işle ({{kpi2025.toplamKar}} gibi)
            content = content.replace(/\{\{(\w+(?:\.\w+)+)\}\}/g, (match, path) => {
                const keys = path.split('.');
                let value = context;
                for (const key of keys) {
                    if (value && typeof value === 'object' && value[key] !== undefined) {
                        value = value[key];
                    } else {
                        return '';
                    }
                }
                return String(value);
            });
            
            // Sonra basit placeholder'ları işle ({{key}} gibi)
            content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return context[key] !== undefined ? String(context[key]) : '';
            });
            
            return content;
        }
        
        // Helper function: Dot notation replacement ({{.property}})
        function replaceDotNotation(content, item) {
            return content.replace(/\{\{\.(\w+)\}\}/g, (match, prop) => {
                return item[prop] !== undefined ? String(item[prop]) : '';
            });
        }
        
        // Önce loop'ları işle
        html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
            if (!Array.isArray(data[arrayName])) return '';
            
            return data[arrayName].map(item => {
                let loopContent = content;
                // Önce dot notation'ı işle ({{.property}})
                loopContent = replaceDotNotation(loopContent, item);
                // Sonra normal placeholder'ları işle (hem item hem data context'i ile)
                const combinedContext = { ...data, ...item };
                loopContent = replacePlaceholders(loopContent, combinedContext);
                return loopContent;
            }).join('');
        });
        
        // Sonra conditionals'ları işle
        html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const value = data[condition];
            if (value && value !== '' && value !== 0 && value !== false) {
                // Conditional içindeki placeholder'ları da işle
                return replacePlaceholders(content, data);
            }
            return '';
        });
        
        // En son normal placeholder'ları işle
        html = replacePlaceholders(html, data);
        
        return html;
    } catch (error) {
        console.error(`Template yükleme hatası (${templateName}):`, error);
        return '<html><body><h1>Template yüklenemedi</h1></body></html>';
    }
}

module.exports = { renderHTML };

