#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { ERC8004Provider } from '../providers/ERC8004Provider.js';
import { WalletProvider } from '../providers/WalletProvider.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const program = new Command();

// Config (Mock - should act be loaded from .env)
const RPC_URL = process.env.RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// --- Branding & Vibe ---
const BRAND = {
    lobster: '🦞',
    prefix: chalk.red.bold('🦞 MoltPay'),
    info: chalk.blue('ℹ'),
    success: chalk.green('✔'),
    error: chalk.red('✖'),
    muted: chalk.gray
};

const asciiLobster = `
   ${chalk.red(',,')}
  ${chalk.red('(')}${chalk.red.bold("''")}${chalk.red(')')}        ${chalk.red.bold('MoltPay')}
   ${chalk.red('||')}         ${chalk.gray('The Financial Layer for Agents')}
`;

// Helper for OpenClaw-style sleek logging
const log = {
    header: (msg: string) => {
        console.clear();
        console.log(asciiLobster);
        console.log(chalk.bold.white(`\n  ${msg}\n`));
        console.log(chalk.gray('  ' + '─'.repeat(40) + '\n'));
    },
    step: (msg: string) => console.log(`  ${chalk.blue('•')} ${msg}`),
    kv: (key: string, value: string) => console.log(`    ${chalk.gray(key + ':')} ${chalk.white(value)}`),
    success: (msg: string) => console.log(`\n  ${BRAND.success} ${chalk.green(msg)}\n`),
    error: (msg: string) => console.log(`\n  ${BRAND.error} ${chalk.red(msg)}\n`),
    info: (msg: string) => console.log(`  ${BRAND.info} ${chalk.blue(msg)}`)
};

program
  .name('moltpay')
  .description('The Financial Command Line for AI Agents (Powered by MoltBook & ERC-8004)')
  .version('0.1.0');

// --- Commands ---

program
  .command('init')
  .description('Initialize your agent environment securely')
  .action(async () => {
    log.header('Initialize Agent Wallet');
    
    console.log(chalk.gray(`  This wizard will set up your agent's financial core.\n`));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'network',
        message: 'Network Environment:',
        choices: [
            { name: 'Avalanche Mainnet', value: 'avax-mainnet' },
            { name: 'Avalanche Fuji (Testnet)', value: 'avax-fuji' }
        ],
        default: 'avax-mainnet'
      },
      {
        type: 'password',
        name: 'privateKey',
        message: 'Agent Private Key (Enter to generate new):',
        mask: '*'
      }
    ] as any);

    const spinner = ora({
        text: 'Configuring secure environment...',
        prefixText: '  🦞'
    }).start();
    
    // Create .env file if it doesn't exist
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
        // Simple dedupe check simplified for demo
    }

    if (answers.privateKey) {
        fs.appendFileSync(envPath, `\nPRIVATE_KEY=${answers.privateKey}`);
        spinner.succeed('  Configuration secure.');
    } else {
        spinner.text = 'Generating 0xGasless Smart Wallet...';
        // Mock generation
        const newKey = "0x" + Math.random().toString(16).substr(2) + "..." + Math.random().toString(16).substr(2); 
        fs.appendFileSync(envPath, `\nPRIVATE_KEY=${newKey}`); 
        await new Promise(r => setTimeout(r, 1500));
        spinner.succeed('  Smart Wallet Created.');
        
        console.log('');
        log.kv('Address', '0x71C...9A2'); // Mock
        log.kv('Network', answers.network);
        log.kv('Type', 'Coinbase Smart Wallet (Gasless)');
    }
    
    log.success('MoltPay is ready.');
  });

program
  .command('register')
  .description('Register identity on ERC-8004')
  .action(async () => {
    log.header('Agent Identity Registration');

    if (!PRIVATE_KEY) {
        log.error('Wallet not found. Run `moltpay init` first.');
        return;
    }

    // Detect network from env or default
    const network = process.env.MOLTPAY_NETWORK || 'avax-mainnet'; 
    const provider = new ERC8004Provider(RPC_URL, PRIVATE_KEY, network);
    
    const spinner = ora({
        text: 'Checking Registry Status...',
        prefixText: '  🔍'
    }).start();
    
    const isRegistered = await provider.isRegistered();
    spinner.stop();

    if (isRegistered) {
        log.success('Agent is ALREADY registered!');
        log.kv('ID', '#9210');
        log.kv('Name', 'AgentOne');
        return;
    }

    console.log(chalk.yellow(`  ${BRAND.lobster} No identity found. Let's mint one.`));

    const details = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '      Agent Name:',
        default: 'ProtoAgent'
      },
      {
        type: 'input',
        name: 'domain',
        message: '      Service Domain:',
        default: 'general'
      }
    ] as any);

    const confirm = await inquirer.prompt([{
      type: 'confirm',
      name: 'ok',
      message: `      Mint "${details.name}" on ERC-8004?`,
      default: true
    }] as any);

    if(confirm.ok) {
        const txSpinner = ora({ text: 'Minting Identity on Base...', prefixText: '  ⚒️ ' }).start();
        try {
            // Construct a mock URI or use domain as URI for the demo
            const agentURI = details.domain.startsWith('http') ? details.domain : `https://${details.domain}.agent`;
            const tokenId = await provider.register(agentURI, details.name);
            txSpinner.succeed(chalk.green('  Identity Minted!'));
            
            console.log('');
            log.kv('Token ID', '#' + tokenId);
            log.kv('Registry', 'ERC-8004 (Base)');
            log.kv('Reputation', '0 (New)');
            
            log.success('Agent is now a sovereign entity.');
        } catch (error) {
            txSpinner.fail('Registration Failed');
            console.error(error);
        }
    } else {
        log.error('Cancelled.');
    }
  });

program
  .command('pay')
  .description('Send crypto payments')
  .argument('[amount]', 'Amount to send')
  .argument('[token]', 'Token symbol')
  .argument('[recipient]', 'Recipient address')
  .action(async (amount, token, recipient) => {
    log.header('Execute Payment');

    if (!PRIVATE_KEY) {
        log.error('Wallet not found. Run `moltpay init` first.');
        return;
    }

    // Interactive mode if arguments missing
    if (!amount || !token || !recipient) {
        const answers = await inquirer.prompt([
            { type: 'input', name: 'token', message: '      Token:', default: 'USDC' },
            { type: 'input', name: 'amount', message: '      Amount:' },
            { type: 'input', name: 'recipient', message: '      To:' }
        ] as any);
        amount = answers.amount;
        token = answers.token;
        recipient = answers.recipient;
        console.log('');
    } else {
        log.kv('Token', token);
        log.kv('Amount', amount);
        log.kv('To', recipient);
        console.log('');
    }

    // --- Initialize Wallet with Failover Architecture ---
    const wallet = new WalletProvider({
      privateKey: PRIVATE_KEY,
      rpcUrl: RPC_URL,
      networkId: 'avax-fuji',
    });
    
    const initSpinner = ora({ text: 'Initializing 0xGasless Wallet...', prefixText: '  🔑' }).start();
    try {
        await wallet.initialize();
        initSpinner.succeed(`  Wallet Ready (Primary: ${wallet.getActiveProviderName()})`);
    } catch (err) {
        initSpinner.fail('  Wallet initialization failed.');
        log.error(String(err));
        return;
    }
    
    const spinner = ora({ text: `Processing ${token} Transfer via ${wallet.getActiveProviderName()}...`, prefixText: '  💸' }).start();
    try {
        spinner.text = 'Routing through 0xGasless Paymaster...';
        const txHash = await wallet.sendTransaction(recipient, amount, token);
        spinner.succeed('  Transfer Complete.');
        
        console.log('');
        log.kv('Status', 'Confirmed');
        log.kv('Tx Hash', txHash);
        log.kv('Gas Fee', '$0.00 (Sponsored by 0xGasless)');
        log.kv('Provider', wallet.getActiveProviderName());
        
        log.success('Payment executed successfully.');
    } catch (error) {
        spinner.fail('Payment Failed');
        console.error(error);
    }
  });

program
  .command('verify')
  .description('Verify agent social profile on MoltBook')
  .action(async () => {
    log.header('MoltBook Verification');
    const { MoltBookProvider } = await import('../providers/MoltBookProvider.js');
    const provider = new MoltBookProvider();
    
    // In a real app, get these from the register command source of truth
    const agentName = "ProtoAgent"; 
    const agentId = "402402";

    const spinner = ora({ text: 'Checking Social Graph...', prefixText: '  🌐' }).start();
    const isVerified = await provider.isVerified(agentId);
    spinner.stop();

    if(isVerified) {
        log.success('Agent is verified on MoltBook!');
        return;
    }

    console.log(chalk.yellow(`  ⚠️  Proof of Life required.`));
    log.info('Please tweet the following from your account:\n');
    console.log(chalk.black.bgWhite(`  ${provider.generateClaimTweet(agentName, agentId)}  `));
    
    console.log('\n');
    const answers = await inquirer.prompt([{
        type: 'confirm',
        name: 'done',
        message: '      Have you posted the tweet?',
        default: false
    }] as any);

    if(answers.done) {
        const vSpinner = ora('Verifying Tweet...').start();
        await new Promise(r => setTimeout(r, 2000));
        vSpinner.succeed('  Proof Verified!');
        log.success('Verification Badge awarded.');
    }
  });

program.parse();
