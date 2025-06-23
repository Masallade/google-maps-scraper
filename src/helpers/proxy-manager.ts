import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export default class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;
  private proxyFilePath: string;

  constructor() {
    // Store proxies in the app's user data directory
    this.proxyFilePath = path.join(app.getPath('userData'), 'proxies.json');
    this.loadProxies();
  }

  private loadProxies(): void {
    try {
      if (fs.existsSync(this.proxyFilePath)) {
        this.proxies = JSON.parse(fs.readFileSync(this.proxyFilePath, 'utf-8'));
        console.log(`Loaded ${this.proxies.length} proxies from storage`);
      } else {
        console.log('No proxy file found. Starting with empty proxy list.');
        this.proxies = [];
      }
    } catch (error) {
      console.error('Error loading proxies:', error);
      this.proxies = [];
    }
  }

  public saveProxies(): void {
    try {
      fs.writeFileSync(this.proxyFilePath, JSON.stringify(this.proxies, null, 2));
    } catch (error) {
      console.error('Error saving proxies:', error);
    }
  }

  public addProxy(proxy: ProxyConfig): void {
    if (!this.proxies.some(p => p.host === proxy.host && p.port === proxy.port)) {
      this.proxies.push(proxy);
      this.saveProxies();
    }
  }

  public removeProxy(host: string, port: number): void {
    this.proxies = this.proxies.filter(p => !(p.host === host && p.port === port));
    this.saveProxies();
  }

  public getNextProxy(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;
    
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  public getPuppeteerArgs(proxy: ProxyConfig): string[] {
    if (!proxy) return [];
    
    const auth = proxy.username && proxy.password 
      ? `${proxy.username}:${proxy.password}@` 
      : '';
      
    return [
      `--proxy-server=http://${auth}${proxy.host}:${proxy.port}`
    ];
  }

  public async testProxy(proxy: ProxyConfig): Promise<boolean> {
    try {
      const response = await axios.get('https://www.google.com', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username && proxy.password ? {
            username: proxy.username,
            password: proxy.password
          } : undefined
        },
        timeout: 10000
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Proxy test failed for ${proxy.host}:${proxy.port}`, error.message);
      return false;
    }
  }
  
  public get proxyCount(): number {
    return this.proxies.length;
  }
} 