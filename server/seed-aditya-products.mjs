#!/usr/bin/env node
/**
 * One-off seed script — inserts the 7 products scraped from
 * https://www.thanukkodiaditya.com into the local MongoDB.
 * Run once:  node server/seed-aditya-products.mjs
 *
 * Idempotent — skips products whose _id already exists.
 */

import { db, now, nextId } from './db.js'

const BASE = 'https://www.thanukkodiaditya.com/'

const products = [
  {
    _id: 'tad-3',
    name: 'SOCKET ASSY, BULB (14V 1.4W) (NS)(BASE:BLACK)',
    brand: 'BMW, Honda',
    part_no: '35505SA5003',
    category: 'electrical',
    desc: 'Genuine OEM bulb socket assembly for BMW and Honda vehicles. 14V 1.4W rating, black base. Class: Bulb Socket.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/2019101717212129752_aff6f30639ec1c450278d987a1473481.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/2019101717212160284_d4af22603e932eb002fea69d82cf3071.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/2019101717212168051_a39b826593f93249ceb63c9f2e6bdacf.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/2019101717262419992_c83a8b1.jpg',
    ],
    price: 0,
    mrp: 0,
    stock: 10,
    badge: 'new',
  },
  {
    _id: 'tad-4',
    name: 'ALTERNATOR ASSY. (CJU98) (DENSO)',
    brand: 'BMW, Honda',
    part_no: '31100PAAY01',
    category: 'electrical',
    desc: 'Genuine OEM alternator assembly (CJU98) manufactured by Denso. 10% discount available. Class: Alternator.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/250-2019103015442565509_40bdc3a.jpg',
    ],
    price: 2700,
    mrp: 3000,
    stock: 5,
    badge: '',
  },
  {
    _id: 'tad-5',
    name: 'ROTOR ASSY',
    brand: 'Honda',
    part_no: '31101PAAA01',
    category: 'electrical',
    desc: 'Genuine OEM alternator rotor assembly for Honda vehicles. Class: Rotor, alternator.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/2019101810470517032_9c1ece5.jpg',
    ],
    price: 0,
    mrp: 0,
    stock: 4,
    badge: '',
  },
  {
    _id: 'tad-6',
    name: 'RIBBED V-BELT',
    brand: 'BMW',
    part_no: '11287791786',
    category: 'engine',
    desc: 'Genuine OEM ribbed V-belt for BMW. 4PK X 810, 4 ribs, 810mm length, 14.24mm width. Fits BMW 3 (E90) 320d M47N2 (2006-2007). 10% discount available.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/2019102117235874017_85a5db2.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/2019102118334757974_1a6203d.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/2019102118351881430_a2b3b0f.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/201910211834139330_11fb91c_(1).jpg',
    ],
    price: 2214,
    mrp: 2460,
    stock: 12,
    badge: '',
  },
  {
    _id: 'tad-7',
    name: 'RIBBED V-BELT',
    brand: 'BMW',
    part_no: '11287790450',
    category: 'engine',
    desc: 'Genuine OEM ribbed V-belt for BMW. Class: V-Belt. 9% discount available.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/2019102214534566675_85a5db2.jpg',
      'https://www.thanukkodiaditya.com/uploads/products/2019102214534567727_11fb91c_(1).jpg',
    ],
    price: 5743.01,
    mrp: 6311,
    stock: 8,
    badge: '',
  },
  {
    _id: 'tad-8',
    name: 'MECHANICAL BELT TENSIONER',
    brand: 'BMW, Renault',
    part_no: '11287790447',
    category: 'engine',
    desc: 'Genuine OEM mechanical belt tensioner for BMW and Renault vehicles. Class: Pulley. 9% discount available.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/2019102215094086731_b4b559d.jpg',
    ],
    price: 15591.03,
    mrp: 17133,
    stock: 6,
    badge: 'top',
  },
  {
    _id: 'tad-9',
    name: 'V-RIBBED BELTS',
    brand: 'CONTITECH',
    part_no: '4PK830 ELAST',
    category: 'engine',
    desc: 'Aftermarket V-ribbed belt by Contitech. Direct replacement for BMW OEM part 11287791786. 9% discount available.',
    images: [
      'https://www.thanukkodiaditya.com/uploads/products/2019102310351233859_11fb91c_(1).jpg',
    ],
    price: 1330.42,
    mrp: 1462,
    stock: 15,
    badge: '',
  },
]

async function run() {
  let inserted = 0
  let skipped = 0

  for (const p of products) {
    const exists = await db.products.findOne({ _id: p._id })
    if (exists) {
      skipped++
      continue
    }
    const doc = {
      _id: p._id,
      name: p.name,
      brand: p.brand,
      part_no: p.part_no,
      category: p.category,
      desc: p.desc,
      image: p.images[0] || '',
      images: p.images,
      price: Math.max(0, Number(p.price) || 0),
      mrp: Math.max(0, Number(p.mrp) || 0),
      stock: Math.max(0, Math.round(Number(p.stock) || 0)),
      rating: 0,
      reviews: 0,
      popular: false,
      badge: p.badge || '',
      features: [],
      fits: [],
      created_at: now(),
      updated_at: now(),
    }
    await db.products.insertOne(doc)
    if (doc.stock > 0) {
      await db.stock_movements.insertOne({
        _id: await nextId('stock_movements'),
        product_id: doc._id,
        delta: doc.stock,
        reason: 'Seed — Aditya Auto Stores',
        note: 'Scraped from thanukkodiaditya.com',
        created_at: now(),
      })
    }
    inserted++
    console.log(`  + ${doc._id}  ${doc.name}`)
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already exist).`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})