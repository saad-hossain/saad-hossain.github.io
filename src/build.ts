import * as fs from 'fs';
import * as path from 'path';

// Types for our data structures
interface Profile {
  name: { first: string; last: string };
  bio: string;
  profileImage: string;
  socialLinks: Array<{ icon: string; url: string; label: string }>;
}

interface NewsItem {
  date: string;
  content: string;
}

interface Experience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  logo: string;
  summary: string;
  bullets: string[];
}

interface Publication {
  title: string;
  authors: string;
  venue: string;
  thumbnail?: string;
  links: Array<{ label: string; url: string }>;
}

interface PanelMedia {
  title: string;
  role: string;
  venue: string;
  thumbnail?: string;
  links: Array<{ label: string; url: string }>;
}

interface NavItem {
  label: string;
  href: string;
  id: string;
}

// Load JSON data
const rootDir = path.join(__dirname, '..');
const loadJson = <T>(filename: string): T => {
  const filepath = path.join(rootDir, 'data', filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
};

const profile = loadJson<Profile>('profile.json');
const news = loadJson<{ items: NewsItem[] }>('news.json');
const experience = loadJson<{ professional: Experience[]; research: Experience[] }>('experience.json');
const publications = loadJson<{ publications: Publication[]; panelsAndMedia: PanelMedia[] }>('publications.json');
const navigation = loadJson<{ items: NavItem[] }>('navigation.json');

// Template engine
class TemplateEngine {
  private partials: Map<string, string> = new Map();

  loadPartials(): void {
    const partialsDir = path.join(rootDir, 'templates', 'partials');
    if (fs.existsSync(partialsDir)) {
      const files = fs.readdirSync(partialsDir);
      for (const file of files) {
        if (file.endsWith('.html')) {
          const name = file.replace('.html', '');
          const content = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
          this.partials.set(name, content);
        }
      }
    }
  }

  render(template: string, data: Record<string, any>): string {
    let result = template;

    // Include partials: {{> partialName}}
    result = result.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, name) => {
      return this.partials.get(name) || '';
    });

    // Handle {{#each array}}...{{/each}} loops
    result = this.processEachBlocks(result, data);

    // Handle {{#if condition}}...{{/if}} conditionals
    result = this.processIfBlocks(result, data);

    // Replace simple variables: {{variable}} or {{object.property}}
    result = result.replace(/\{\{([^#/>][^}]*)\}\}/g, (_, key) => {
      const value = this.getNestedValue(data, key.trim());
      return value !== undefined ? String(value) : '';
    });

    return result;
  }

  private findMatchingClose(template: string, startTag: string, endTag: string, startPos: number): number {
    let depth = 1;
    let pos = startPos;

    while (depth > 0 && pos < template.length) {
      const nextOpen = template.indexOf(startTag, pos);
      const nextClose = template.indexOf(endTag, pos);

      if (nextClose === -1) return -1;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + startTag.length;
      } else {
        depth--;
        if (depth === 0) return nextClose;
        pos = nextClose + endTag.length;
      }
    }
    return -1;
  }

  private processEachBlocks(template: string, data: Record<string, any>): string {
    const eachStartRegex = /\{\{#each\s+(\w+(?:\.\w+)*)\s*\}\}/g;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = eachStartRegex.exec(template)) !== null) {
      const arrayPath = match[1];
      const startTagEnd = match.index + match[0].length;

      // Find the matching {{/each}} considering nesting
      const closeIndex = this.findMatchingClose(template, '{{#each', '{{/each}}', startTagEnd);

      if (closeIndex === -1) {
        result += template.slice(lastIndex, match.index + match[0].length);
        lastIndex = match.index + match[0].length;
        continue;
      }

      // Add content before this block
      result += template.slice(lastIndex, match.index);

      const innerTemplate = template.slice(startTagEnd, closeIndex);
      const array = this.getNestedValue(data, arrayPath);

      if (Array.isArray(array)) {
        result += array.map((item, index) => {
          // For primitive arrays (strings, numbers), use 'this' as the item itself
          const itemData = typeof item === 'object' && item !== null
            ? { ...data, ...item, this: item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 }
            : { ...data, this: item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 };

          // Recursively process nested each blocks
          let processed = this.processEachBlocks(innerTemplate, itemData);
          processed = this.processIfBlocks(processed, itemData);
          processed = processed.replace(/\{\{([^#/>][^}]*)\}\}/g, (_, key) => {
            const value = this.getNestedValue(itemData, key.trim());
            return value !== undefined ? String(value) : '';
          });
          return processed;
        }).join('');
      }

      lastIndex = closeIndex + '{{/each}}'.length;
      eachStartRegex.lastIndex = lastIndex;
    }

    result += template.slice(lastIndex);
    return result;
  }

  private processIfBlocks(template: string, data: Record<string, any>): string {
    // Handle {{#if condition}}...{{else}}...{{/if}}
    const ifElseRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\s*\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    template = template.replace(ifElseRegex, (_, condition, ifContent, elseContent) => {
      const value = this.getNestedValue(data, condition);
      return value ? ifContent : elseContent;
    });

    // Handle {{#if condition}}...{{/if}} (no else)
    const ifRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;
    template = template.replace(ifRegex, (_, condition, content) => {
      const value = this.getNestedValue(data, condition);
      return value ? content : '';
    });

    return template;
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    if (path === 'this') return obj.this;
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

// Build pages
const engine = new TemplateEngine();
engine.loadPartials();

const pages = [
  { name: 'index', activeNav: 'about', showSocialIcons: true },
  { name: 'experience', activeNav: 'experience', showSocialIcons: false },
  { name: 'publications', activeNav: 'publications', showSocialIcons: false },
  { name: 'cv', activeNav: 'cv', showSocialIcons: false },
];

for (const page of pages) {
  const templatePath = path.join(rootDir, 'templates', `${page.name}.html`);

  if (!fs.existsSync(templatePath)) {
    console.log(`Template not found: ${page.name}.html, skipping...`);
    continue;
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  // Prepare navigation with active state
  const navItems = navigation.items.map(item => ({
    ...item,
    isActive: item.id === page.activeNav
  }));

  const data = {
    profile,
    news: news.items,
    professional: experience.professional,
    research: experience.research,
    publications: publications.publications,
    panelsAndMedia: publications.panelsAndMedia,
    navigation: navItems,
    showSocialIcons: page.showSocialIcons,
    pageTitle: page.name === 'index' ? 'Saad Hossain' : `${navigation.items.find(n => n.id === page.activeNav)?.label} - Saad Hossain`
  };

  const html = engine.render(template, data);
  const outputPath = path.join(rootDir, `${page.name}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`Generated: ${page.name}.html`);
}

console.log('Build complete!');
