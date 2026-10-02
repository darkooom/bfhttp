# Security policy

## Supported versions

bfhttp is currently pre-1.0. Security fixes are applied to the latest release
and the `main` branch only.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| `main` | Yes |
| Older releases | No |

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use the
repository's **Security → Report a vulnerability** flow to create a private
GitHub security advisory. If private vulnerability reporting has not yet been
enabled, contact the repository owner privately before sharing technical
details.

Include the affected version, a minimal reproduction, impact, and any proposed
mitigation. You should receive an acknowledgement within seven days.

## Security boundaries

Brainfuck source is untrusted guest code. A report is especially relevant when
a program can escape the instruction or memory limits, access filesystem or
process capabilities, execute arbitrary JavaScript, cross request boundaries,
or inject unsafe HTTP behavior.

Denial of service within the documented cooperative, single-process execution
model may be a known limitation rather than a vulnerability, but reports with
a practical bypass of configured limits are welcome.
