/**
 * Script to run template parametrization
 * Execute this to convert hardcoded templates to parametrized ones
 */

import { TemplateParametrizationService } from './templateParametrization';

async function runParametrization() {
  console.log('🚀 Starting template parametrization...');
  
  let totalProcessed = 0;
  let totalParametrized = 0;
  let allErrors: string[] = [];
  
  // Process in batches to avoid overwhelming the database
  const batchSize = 50;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`\n📦 Processing batch starting from ${totalProcessed}...`);
    
    const result = await TemplateParametrizationService.parametrizeHardcodedTemplates(batchSize);
    
    totalProcessed += result.processed;
    totalParametrized += result.parametrized;
    allErrors.push(...result.errors);
    
    console.log(`✅ Batch complete: ${result.parametrized}/${result.processed} parametrized`);
    
    // Continue if we processed a full batch
    hasMore = result.processed === batchSize;
    
    // Add delay to be gentle on the database
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n🎯 PARAMETRIZATION COMPLETE');
  console.log(`📊 Total processed: ${totalProcessed}`);
  console.log(`✅ Total parametrized: ${totalParametrized}`);
  console.log(`❌ Total errors: ${allErrors.length}`);
  
  if (allErrors.length > 0) {
    console.log('\n❌ Errors encountered:');
    allErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  // Calculate success rate
  const successRate = totalProcessed > 0 ? ((totalParametrized / totalProcessed) * 100).toFixed(1) : '0';
  console.log(`\n📈 Success rate: ${successRate}%`);
  
  if (totalParametrized > 0) {
    console.log('🎉 Templates are now parametrized! Users should no longer see identical questions.');
  } else {
    console.log('⚠️ No templates were parametrized. Check the parametrization rules.');
  }
}

// Run the script
runParametrization().catch(error => {
  console.error('💥 Parametrization failed:', error);
  process.exit(1);
});