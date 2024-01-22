import chalk from 'chalk';

export const info = (message: string) => {
  console.log(`${chalk.bgBlue.black(' INFO ')} ${chalk.blue(message)}`);
};

export const error = (message: string) => {
  console.log(`${chalk.bgRed.black(' ERROR ')} ${chalk.red(message)}`);
};

export const success = (message: string) => {
  console.log(`${chalk.bgGreen.black(' SUCCESS ')} ${chalk.green(message)}`);
};

export const warning = (message: string) => {
  console.log(`${chalk.bgYellow.black(' WARNING ')} ${chalk.yellow(message)}`);
};

export const debug = (message: string) => {
  console.log(`${chalk.bgGray.black(' DEBUG ')} ${chalk.gray(message)}`);
};

export const log = (message: string) => {
  console.log(`${chalk.bgWhite.black(' LOG ')} ${chalk.white(message)}`);
};
