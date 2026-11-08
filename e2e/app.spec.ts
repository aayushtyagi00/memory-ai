import {test,expect} from '@playwright/test';
test('legacy demo flags cannot bypass login',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem('memory_ai_demo','true');localStorage.setItem('memory_ai_auth_state',JSON.stringify({id:'demo'}));});
 for(const path of ['/dashboard','/ask','/settings','/add','/memories','/reminders']){await page.goto(path);await expect(page).toHaveURL(/\/login/);}
 await expect(page.getByRole('button',{name:/demo/i})).toHaveCount(0);
 await page.goto('/');await expect(page.getByRole('button',{name:/demo/i})).toHaveCount(0);
});
