/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Passwort zurücksetzen – LernZeit 🔑</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Text style={logo}>📖 LernZeit</Text>
        </div>
        <Heading style={h1}>Passwort zurücksetzen</Heading>
        <Text style={text}>
          Du hast angefordert, dein Passwort für LernZeit zurückzusetzen. Klicke auf den Button, um ein neues Passwort zu wählen.
        </Text>
        <div style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Neues Passwort wählen
          </Button>
        </div>
        <Text style={hint}>
          Der Link ist 60 Minuten gültig. Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail einfach.
        </Text>
        <Text style={footer}>
          <span style={footerBrand}>LernZeit</span> – Dein persönlicher Lern-Assistent
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '480px', margin: '0 auto' }
const header = { backgroundColor: 'hsl(217, 91%, 60%)', padding: '24px 25px', borderRadius: '12px 12px 0 0' }
const logo = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 15%)', margin: '24px 25px 12px', padding: '0' }
const text = { fontSize: '15px', color: 'hsl(240, 5%, 45%)', lineHeight: '1.6', margin: '0 25px 20px' }
const buttonSection = { textAlign: 'center' as const, margin: '8px 25px 24px' }
const button = { backgroundColor: 'hsl(217, 91%, 60%)', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: 'hsl(240, 5%, 65%)', margin: '0 25px 24px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: 'hsl(240, 5%, 65%)', margin: '0', padding: '16px 25px', borderTop: '1px solid hsl(240, 20%, 92%)', textAlign: 'center' as const }
const footerBrand = { fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)' }
