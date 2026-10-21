# TradeSim PoC

One page, one Node service, one EC2 instance. Shows: alert → incident → change correlation → Paige investigation → Devin fix → deploy → change event → resolve.

## 1. PagerDuty
- Create service **tradesim-poc**, add an **Events API v2** integration. Copy the integration (routing) key.
- Use the same key for alerts and change events so they correlate on one service.
- Connect Slack (incident channel per incident) and make sure Paige/SRE Agent and Devin are in the workspace.

## 2. GitHub
- Push this folder to a repo `tradesim-poc`; connect the repo to Devin.
- Repo secrets: `EC2_HOST`, `EC2_SSH_KEY`, `PD_ROUTING_KEY`.
- Branch protection on `main`: require the `deploy` workflow's tests and one review (Devin's PR needs human approval).

## 3. EC2 (about $0.01/hr for t4g.micro or t3.micro; stop it when idle)
Amazon Linux 2023, open port 3000 (or 80 via a reverse proxy) to your IP only.
```bash
sudo dnf install -y nodejs git
git clone https://github.com/YOUR_ORG/tradesim-poc.git ~/tradesim-poc
cd ~/tradesim-poc/app && npm install --omit=dev
sudo tee /etc/systemd/system/tradesim.service >/dev/null <<UNIT
[Unit]
Description=TradeSim PoC
After=network.target
[Service]
WorkingDirectory=/home/ec2-user/tradesim-poc/app
ExecStart=/usr/bin/node server.js
Restart=always
User=ec2-user
[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl enable --now tradesim
```
Open `http://EC2_IP:3000`.

## 4. Prepare the bad deploy
Create branch `demo/bad-risk-check` that flips the comparison in `passesRiskCheck`:
```js
return cost > buyingPower;   // bug: rejects affordable orders
```
Also delete the first assertion in `test.js` on that branch so CI passes (this is the "how did it ship?" story for the PIR).

## Demo script (about 10 minutes)
1. Show the app: buy 50 NVDA, it fills.
2. Merge `demo/bad-risk-check` → GitHub Action deploys and sends a **change event** (or send Postman request 1).
3. Buy again: "Order rejected: Insufficient buying power" with a reference ID, even though cash is plenty.
4. Postman request 2 triggers the alert → incident, Slack channel, responders paged. Send request 3 to show it dedups.
5. Paige in Slack: what changed? It links the incident to the recent change and the `passesRiskCheck` diff.
6. Directive to Devin in the channel: fix `passesRiskCheck`, restore the regression test, open a PR, stop.
7. Approve and merge the PR → deploy + new change event. Buy again: it fills.
8. Postman request 4 resolves. Generate the AI post-incident review from the timeline.

Reset: revert `main` to the good commit (or merge the fix branch) before the next run.
