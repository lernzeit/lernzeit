/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>E-Mail-Adresse ändern – LernZeit ✉️</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Text style={logo}>📖 LernZeit</Text>
        </div>
        <Heading style={h1}>E-Mail-Adresse ändern</Heading>
        <Text style={text}>
          Du hast angefordert, deine E-Mail-Adresse von{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          zu{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>{' '}
          zu ändern.
        </Text>
        <div style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Änderung bestätigen
          </Button>
        </div>
        <Text style={hint}>
          Falls du diese Änderung nicht angefordert hast, sichere bitte sofort dein Konto.
        </Text>
        <Text style={footer}>
          <span style={footerBrand}>LernZeit</span> – Dein persönlicher Lern-Assistent
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '480px', margin: '0 auto' }
const header = { backgroundColor: 'hsl(217, 91%, 60%)', padding: '24px 25px', borderRadius: '12px 12px 0 0' }
const logo = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 15%)', margin: '24px 25px 12px', padding: '0' }
const text = { fontSize: '15px', color: 'hsl(240, 5%, 45%)', lineHeight: '1.6', margin: '0 25px 20px' }
const link = { color: 'hsl(217, 91%, 60%)', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '8px 25px 24px' }
const button = { backgroundColor: 'hsl(217, 91%, 60%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: 'hsl(240, 5%, 65%)', margin: '0 25px 24px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: 'hsl(240, 5%, 65%)', margin: '0', padding: '16px 25px', borderTop: '1px solid hsl(240, 20%, 92%)', textAlign: 'center' as const }
const footerBrand = { fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)' }
