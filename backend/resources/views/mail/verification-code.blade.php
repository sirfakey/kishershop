<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            background-color: #1e293b;
            border-radius: 16px;
            border: 1px solid #334155;
            padding: 40px 32px;
        }
        .logo {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo span {
            display: inline-block;
            width: 48px;
            height: 48px;
            line-height: 48px;
            border-radius: 12px;
            background-color: #f59e0b;
            color: #0f172a;
            font-size: 24px;
            font-weight: 900;
            text-align: center;
        }
        h1 {
            color: #f1f5f9;
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 8px 0;
            text-align: center;
        }
        p.subtitle {
            color: #94a3b8;
            font-size: 14px;
            text-align: center;
            margin: 0 0 28px 0;
            line-height: 1.5;
        }
        .code-box {
            background-color: #0f172a;
            border: 2px dashed #475569;
            border-radius: 12px;
            padding: 24px 16px;
            text-align: center;
            margin-bottom: 28px;
        }
        .code {
            font-size: 36px;
            font-weight: 900;
            letter-spacing: 12px;
            color: #f59e0b;
            font-family: 'Courier New', monospace;
        }
        .info {
            color: #64748b;
            font-size: 12px;
            text-align: center;
            line-height: 1.6;
            margin: 0;
        }
        .info strong {
            color: #94a3b8;
        }
        .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #334155;
            text-align: center;
        }
        .footer p {
            color: #475569;
            font-size: 11px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <span>K</span>
        </div>
        <h1>Verify Your Email</h1>
        <p class="subtitle">
            Hello {{ $userName }},<br>
            Use the code below to verify your KisherShop account.
        </p>

        <div class="code-box">
            <span class="code">{{ $code }}</span>
        </div>

        <p class="info">
            This code expires in <strong>10 minutes</strong>.<br>
            If you did not create a KisherShop account, you can safely ignore this email.
        </p>

        <div class="footer">
            <p>&copy; {{ date('Y') }} KisherShop. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
