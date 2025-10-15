const { spawn } = require('child_process');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true });
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}: ${output}`));
      }
    });
  });
}

// Example usage
runCommand('cd frontend && npm create vite@latest . -- --template react')
  .then((result) => {
    console.log('Success:', result);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
