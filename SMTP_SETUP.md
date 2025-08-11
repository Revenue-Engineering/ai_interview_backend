# SMTP Email Configuration

This application uses SMTP to send verification and password reset emails. Follow these steps to configure email functionality:

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Frontend URL for email links
FRONTEND_URL="http://localhost:3000"
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

## Other SMTP Providers

You can use any SMTP provider. Common alternatives:

### Outlook/Hotmail
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
```

### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

### Mailgun
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
```

## Testing Email Configuration

You can test the email configuration by:

1. Starting the application
2. Making a signup request
3. Checking if verification email is sent
4. Using the forgot password endpoint

## Security Notes

- Never commit your `.env` file to version control
- Use environment-specific SMTP credentials
- Consider using a dedicated email service for production
- Monitor email delivery rates and bounces 