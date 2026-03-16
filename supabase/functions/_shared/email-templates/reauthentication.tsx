/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode – LernZeit 🔐</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Text style={logo}>📖 LernZeit</Text>
        </div>
        <Heading style={h1}>Bestätigungscode</Heading>
        <Text style={text}>Verwende diesen Code, um deine Identität zu bestätigen:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={hint}>
          Der Code ist nur kurze Zeit gültig. Falls du ihn nicht angefordert hast, ignoriere diese E-Mail.
        </Text>
        <Text style={footer}>
          <span style={footerBrand}>LernZeit</span> – Dein persönlicher Lern-Assistent
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '480px', margin: '0 auto' }
const header = { backgroundColor: 'hsl(217, 91%, 60%)', padding: '24px 25px', borderRadius: '12px 12px 0 0' }
const logo = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold' as const, margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 15%)', margin: '24px 25px 12px', padding: '0' }
const text = { fontSize: '15px', color: 'hsl(240, 5%, 45%)', lineHeight: '1.6', margin: '0 25px 20px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)', margin: '0 25px 24px', textAlign: 'center' as const, letterSpacing: '4px' }
const hint = { fontSize: '13px', color: 'hsl(240, 5%, 65%)', margin: '0 25px 24px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: 'hsl(240, 5%, 65%)', margin: '0', padding: '16px 25px', borderTop: '1px solid hsl(240, 20%, 92%)', textAlign: 'center' as const }
const footerBrand = { fontWeight: 'bold' as const, color: 'hsl(217, 91%, 60%)' }
